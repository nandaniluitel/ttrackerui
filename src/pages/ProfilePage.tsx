import { useEffect, useState } from "react";
import { fetchProfile, type Profile } from "@/features/profile/profile.api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchProfile();
        if (!alive) return;
        setProfile(data);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message || e?.message || "Failed to load profile.";
        setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>
    );
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Account / Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account information.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="p-6 flex flex-col items-center gap-4">
          {/* Avatar */}
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-semibold text-muted-foreground border">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="text-center">
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mt-2">
              {profile.role}
            </span>
          </div>
        </div>

        <div className="border-t px-6 py-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{profile.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{profile.role}</span>
          </div>
          {profile.profileImageUrl && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Image URL</span>
              <span className="font-medium truncate max-w-[250px]">
                {profile.profileImageUrl}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
