import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./config";

function uploadFile(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export function uploadRegistrationPhoto(orgId, eventId, registrationId, file, onProgress) {
  const ext = file.type === "image/png" ? "png" : "jpg";
  return uploadFile(`orgs/${orgId}/events/${eventId}/registrations/${registrationId}/photo.${ext}`, file, onProgress);
}

export function uploadOrgLogo(orgId, file, onProgress) {
  const ext = file.type === "image/png" ? "png" : "jpg";
  return uploadFile(`orgs/${orgId}/logo/logo.${ext}`, file, onProgress);
}

export function uploadEventBanner(orgId, eventId, file, onProgress) {
  const ext = file.type === "image/png" ? "png" : "jpg";
  return uploadFile(`orgs/${orgId}/events/${eventId}/banner/banner.${ext}`, file, onProgress);
}
