const FALLBACK_CLIENT_ID = "2650368982-2pvrjvr293snin1fa6150024rehp4eet.apps.googleusercontent.com";
const CLIENT_ID = (import.meta as any).env.VITE_GDRIVE_CLIENT_ID || FALLBACK_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";

export const getDriveToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            reject(response);
          }
          resolve(response.access_token);
        },
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
};

export const uploadToDrive = async (token: string, fileData: string, fileName: string) => {
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([fileData], { type: 'application/json' }));
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive');
  }
  return response.json();
};

export const listBackupFiles = async (token: string) => {
  // We search for files containing "PortalUang_Backup" in the name
  const query = encodeURIComponent("name contains 'PortalUang_Backup' and trashed = false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to list files from Google Drive');
  }
  const data = await response.json();
  return data.files || [];
};

export const downloadFromDrive = async (token: string, fileId: string) => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to download file from Google Drive');
  }
  return response.text();
};