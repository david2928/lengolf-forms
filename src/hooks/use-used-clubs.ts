import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Request failed')
  return r.json()
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClubSet {
  id: string
  name: string
  brand: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ClubSetWithCount extends ClubSet {
  used_clubs_inventory: { count: number }[]
}

export interface UsedClub {
  id: string
  brand: string
  model: string | null
  club_type: string
  specification: string | null
  shaft: string | null
  gender: string
  condition: string
  price: number
  cost: number | null
  description: string | null
  image_url: string | null
  available_for_sale: boolean
  available_for_rental: boolean
  set_id: string | null
  created_at: string
  updated_at: string
  club_sets?: { id: string; name: string; brand: string } | null
}

// ── Staff hooks ────────────────────────────────────────────────────────────

export function useRecentClubs() {
  const { data, error, isLoading, mutate } = useSWR<UsedClub[]>(
    '/api/used-clubs/recent',
    fetcher,
    { refreshInterval: 0 }
  )
  return { clubs: data || [], isLoading, error, mutate }
}

export function useClubSets() {
  const { data, error, isLoading, mutate } = useSWR<ClubSet[]>(
    '/api/used-clubs/sets',
    fetcher,
    { refreshInterval: 0 }
  )
  return { sets: data || [], isLoading, error, mutate }
}

// ── Admin hooks ────────────────────────────────────────────────────────────

export function useAllClubs() {
  const { data, error, isLoading, mutate } = useSWR<UsedClub[]>(
    '/api/admin/used-clubs',
    fetcher,
    { refreshInterval: 0 }
  )
  return { clubs: data || [], isLoading, error, mutate }
}

export function useAdminClubSets() {
  const { data, error, isLoading, mutate } = useSWR<ClubSetWithCount[]>(
    '/api/admin/used-clubs/sets',
    fetcher,
    { refreshInterval: 0 }
  )
  return { sets: data || [], isLoading, error, mutate }
}

// ── Mutations ──────────────────────────────────────────────────────────────

export async function uploadClubImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/used-clubs/upload-image', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Image upload failed')
  }
  const { url } = await res.json()
  return url as string
}

export async function createClub(data: Omit<UsedClub, 'id' | 'cost' | 'created_at' | 'updated_at' | 'club_sets'>) {
  const res = await fetch('/api/used-clubs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create club')
  }
  return res.json()
}

export async function adminCreateClub(data: Omit<UsedClub, 'id' | 'created_at' | 'updated_at' | 'club_sets'>) {
  const res = await fetch('/api/admin/used-clubs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create club')
  }
  return res.json()
}

export async function updateClub(id: string, data: Partial<UsedClub>) {
  const res = await fetch(`/api/admin/used-clubs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update club')
  }
  return res.json()
}

export async function deleteClub(id: string) {
  const res = await fetch(`/api/admin/used-clubs/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete club')
  }
}

export async function createSet(data: { name: string; brand: string; description?: string }) {
  const res = await fetch('/api/admin/used-clubs/sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create set')
  }
  return res.json()
}

export async function updateSet(data: { id: string; name: string; brand: string; description?: string }) {
  const res = await fetch('/api/admin/used-clubs/sets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update set')
  }
  return res.json()
}

export async function deleteSet(id: string) {
  const res = await fetch(`/api/admin/used-clubs/sets?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete set')
  }
}
