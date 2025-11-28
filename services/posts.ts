import { supabase } from '@/lib/supabase';
import { getProfileIdOrThrow } from '@/services/helpers';
import type {
  Post,
  PostLocationInput,
  PostMedia,
  PostMediaRecord,
  PostRecord,
  PostWithMedia,
} from '@/types';

export interface CreatePostMediaInput {
  uri: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
}

export interface CreatePostInput {
  body?: string | null;
  media?: CreatePostMediaInput[];
  location?: PostLocationInput | null;
}

const POSTS_TABLE = 'posts';
const MEDIA_TABLE = 'post_media';
const MEDIA_BUCKET = 'post-media';

const mapPost = (record: PostRecord): Post => ({
  id: record.id,
  profileId: record.profile_id,
  body: record.body ?? undefined,
  mediaCount: Number(record.media_count),
  createdAt: record.created_at,
  updatedAt: record.updated_at,
  locationName: record.location_name ?? undefined,
  locationLatitude: parseNullableNumber(record.location_latitude),
  locationLongitude: parseNullableNumber(record.location_longitude),
});

const parseNullableNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapPostMedia = (
  record: PostMediaRecord,
  options?: { includePublicUrl?: boolean }
): PostMedia => {
  const media: PostMedia = {
    id: record.id,
    postId: record.post_id,
    storagePath: record.storage_path,
    mimeType: record.mime_type ?? undefined,
    width: record.width ?? undefined,
    height: record.height ?? undefined,
    sortOrder: record.sort_order,
    createdAt: record.created_at,
  };

  if (options?.includePublicUrl) {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(record.storage_path);
    if (data?.publicUrl) {
      media.publicUrl = data.publicUrl;
    }
  }

  return media;
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

function inferMimeType(input: CreatePostMediaInput) {
  if (input.mimeType) {
    return input.mimeType;
  }
  if (input.fileName) {
    const fromName = mimeFromFilename(input.fileName);
    if (fromName) return fromName;
  }
  return mimeFromFilename(input.uri) ?? 'image/jpeg';
}

function mimeFromFilename(name?: string | null) {
  if (!name) return null;
  const match = /\.(\w+)$/.exec(name.toLowerCase());
  if (!match) return null;
  const ext = match[1];
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'webp':
      return 'image/webp';
    default:
      return null;
  }
}

function extensionFromMime(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType] ?? 'jpg';
}

function buildStoragePath(profileId: string, postId: string, index: number, extension: string) {
  const uniqueSuffix = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return `${profileId}/${postId}/${uniqueSuffix}.${extension}`;
}

async function uploadMediaFile(storagePath: string, uri: string, contentType: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read media file.');
  }
  const blob = await response.blob();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, blob, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw error;
  }
}

export async function createPost(input: CreatePostInput): Promise<PostWithMedia> {
  const profileId = await getProfileIdOrThrow();
  const attachments = input.media?.filter((item): item is CreatePostMediaInput => Boolean(item?.uri)) ?? [];
  const trimmedBody = input.body?.trim();

  if (!trimmedBody && attachments.length === 0) {
    throw new Error('Share some text or add at least one photo.');
  }

  const { data: postRecord, error: postError } = await supabase
    .from(POSTS_TABLE)
    .insert({
      profile_id: profileId,
      body: trimmedBody ?? null,
      media_count: attachments.length,
      location_name: input.location?.name ?? null,
      location_latitude: input.location?.latitude ?? null,
      location_longitude: input.location?.longitude ?? null,
    })
    .select('*')
    .single();

  if (postError || !postRecord) {
    throw postError ?? new Error('Failed to create post.');
  }

  const post = mapPost(postRecord);
  const uploadedPaths: string[] = [];

  try {
    if (!attachments.length) {
      return { ...post, media: [] };
    }

    const rowsToInsert = [];
    for (let index = 0; index < attachments.length; index += 1) {
      const attachment = attachments[index]!;
      const mimeType = inferMimeType(attachment);
      const extension = extensionFromMime(mimeType);
      const storagePath = buildStoragePath(profileId, post.id, index, extension);

      await uploadMediaFile(storagePath, attachment.uri, mimeType);
      uploadedPaths.push(storagePath);

      rowsToInsert.push({
        post_id: post.id,
        storage_path: storagePath,
        mime_type: mimeType,
        width: attachment.width ?? null,
        height: attachment.height ?? null,
        sort_order: index,
      });
    }

    const { data: mediaRecords, error: mediaError } = await supabase
      .from(MEDIA_TABLE)
      .insert(rowsToInsert)
      .select('*');

    if (mediaError || !mediaRecords) {
      throw mediaError ?? new Error('Failed to save post media.');
    }

    return { ...post, media: mediaRecords.map((record) => mapPostMedia(record)) };
  } catch (error) {
    await supabase.from(POSTS_TABLE).delete().eq('id', post.id);
    if (uploadedPaths.length) {
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

type PostRecordWithMedia = PostRecord & {
  post_media?: PostMediaRecord[] | null;
};

export async function fetchMyPosts(limit = 20): Promise<PostWithMedia[]> {
  const profileId = await getProfileIdOrThrow();
  const { data, error } = await supabase
    .from<PostRecordWithMedia>(POSTS_TABLE)
    .select('*, post_media(*)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw error ?? new Error('Failed to load posts.');
  }

  return data.map((record) => ({
    ...mapPost(record),
    media: (record.post_media ?? []).map((item) => mapPostMedia(item, { includePublicUrl: true })),
  }));
}

