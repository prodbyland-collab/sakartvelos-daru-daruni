import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export async function resolvePhoto(path: string): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const cached = cache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  const url = data?.signedUrl ?? "";
  if (url) cache.set(path, url);
  return url;
}

export function usePhotoUrl(path: string | null | undefined) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl("");
      return;
    }
    resolvePhoto(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function Photo({
  path,
  alt,
  className,
  fallback,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const url = usePhotoUrl(path);

  if (!url) {
    return (
      <div className={`${className ?? ""} grid place-items-center bg-muted text-muted-foreground`}>
        <span className="font-serif text-2xl">{fallback ?? "?"}</span>
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
