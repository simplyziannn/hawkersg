// src/pages/EditConsumerProfilePage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';

export default function EditConsumerProfilePage({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const MAX_FILE_SIZE_MB = 2;
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // 1. Modal / Navigation Effects
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstInputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") navigate(-1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // 2. State Management (Initialized with currentUser data)
  const [form, setForm] = useState<{
    username: string;
    password: string;
    confirmPassword: string;
    profilePic: File | null;
  }>({
    username: currentUser?.username || "",
    password: "",
    confirmPassword: "",
    profilePic: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  //ref to reset the <input type="file">
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to clear selected image + reset native input
  function clearSelectedImage() {
    setForm(f => ({ ...f, profilePic: null }));
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // clears the native file input
    }
  }

  function onChange<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    if (key === 'profilePic') {
      setFileError(null);
      const file = value as File | null;
      if (file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          setFileError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
          setForm((f) => ({ ...f, profilePic: null }));
          return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setFileError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`);
          setForm((f) => ({ ...f, profilePic: null }));
          return;
        }
      }
    }
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  // 3. Submission Handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (fileError) {
      setLoading(false);
      return;
    }

    const changingPassword = form.password.length > 0;

    // Password validation (only if changing password)
    if (changingPassword) {
      if (form.password.length < 8) {
        setError("New password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("New password and confirm password do not match.");
        setLoading(false);
        return;
      }
    }

    // Prepare FormData
    const updateData = new FormData();
    let isDataToUpdate = false;

    if (form.username !== currentUser?.username && form.username.trim() !== '') {
      updateData.append('username', form.username.trim());
      isDataToUpdate = true;
    }

    if (changingPassword) {
      updateData.append('password', form.password);
      isDataToUpdate = true;
    }

    if (form.profilePic) {
      updateData.append('profile_pic', form.profilePic);
      isDataToUpdate = true;
    }

    if (!isDataToUpdate) {
      setError('No changes detected.');
      setLoading(false);
      return;
    }

    // API Call
    try {
      await updateProfile(updateData);
      navigate(-1); // Close modal on success
    } catch (err: any) {
      // Note: Use err.message here to display the specific Pydantic error from the backend.
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) navigate(-1);
  }

  const roundedInput =
    "w-full rounded-xl border border-gray-300 px-3 py-2 text-[15px] " +
    "focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        className="w-[min(92vw,720px)] rounded-[2rem] border-4 border-red-600 border-dashed bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >

        <form onSubmit={onSubmit} className="px-6 py-6 space-y-6">
          <h2 id="edit-profile-title" className="text-2xl font-bold text-gray-900 mb-4">
            Edit Profile
          </h2>

          {/* Form Errors */}
          {(error || fileError) && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error || fileError}
            </div>
          )}

          {/* New Username */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              New Username
            </label>
            <input
              ref={firstInputRef}
              className={roundedInput}
              value={form.username}
              onChange={(e) => onChange("username", e.target.value)}
              placeholder={currentUser?.username || "Enter new username"}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-base font-semibold text-gray-900">
                New Password
              </label>
              <span className="text-xs text-red-600">
                At least 8 characters
              </span>
            </div>
            <div className="relative">
              <input
                className={`${roundedInput} pr-10`}
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-base font-semibold text-gray-900">
                Confirm New Password
              </label>
              <span className="text-xs text-red-600">
                Must match the password above
              </span>
            </div>
            <div className="relative">
              <input
                className={`${roundedInput} pr-10`}
                type={showPwd2 ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => onChange("confirmPassword", e.target.value)}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPwd2((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                aria-label={showPwd2 ? "Hide password" : "Show password"}
              >
                {showPwd2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              Profile Picture
            </label>

            <div className="flex items-center gap-4">
              {form.profilePic ? (
                <img
                  src={URL.createObjectURL(form.profilePic)}
                  alt="Preview"
                  className="h-16 w-16 rounded-full object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                  {currentUser?.profile_pic ? "Current" : "No Pic"}
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <span className="px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm">
                    {form.profilePic ? form.profilePic.name : 'Choose image'}
                  </span>
                  <input
                    ref={fileInputRef}                      
                    type="file"
                    accept="image/*"
                    onChange={(e) => onChange("profilePic", e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>

                {/* Clear button appears only if a file is selected */}
                {form.profilePic && (
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-sm hover:bg-gray-50"
                    aria-label="Clear selected image"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-red-600">
              Max Image Size: {MAX_FILE_SIZE_MB}MB. Allowed types: {ALLOWED_MIME_TYPES.join(', ')}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="px-4 py-2 border rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!fileError}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
