// Local per-unit miniature photos. GW artwork is copyrighted and Wahapedia
// ships no unit images, so players attach photos of their own minis. Stored
// as downscaled JPEG data-URLs in IndexedDB, keyed `${edition}:${unitId}`.

import { useCallback, useEffect, useState } from 'react';
import type { Edition } from './types';

const DB_NAME = 'ttr-photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error as Error);
  });
}

function photoKey(ed: Edition, unitId: string): string {
  return `${ed}:${unitId}`;
}

export async function getPhoto(ed: Edition, unitId: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(photoKey(ed, unitId));
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => reject(req.error as Error);
    });
  } catch {
    return null;
  }
}

export async function setPhoto(ed: Edition, unitId: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, photoKey(ed, unitId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });
}

export async function deletePhoto(ed: Edition, unitId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(photoKey(ed, unitId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });
}

/** Downscale an image file to fit `max` px and encode as a JPEG data-URL. */
export function downscalePhoto(file: File, max = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not read image')); };
    img.src = url;
  });
}

/** React hook: the unit's photo data-URL (null when none) and a refresher. */
export function usePhoto(ed: Edition, unitId: string): [string | null, () => void] {
  const [photo, setPhotoState] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    void getPhoto(ed, unitId).then((p) => { if (alive) setPhotoState(p); });
    return () => { alive = false; };
  }, [ed, unitId, tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return [photo, refresh];
}
