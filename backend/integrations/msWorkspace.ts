export interface OutlookMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  importance: "low" | "normal" | "high";
  from?: { emailAddress?: { name?: string; address?: string } };
}

export interface OneDriveItem {
  id: string;
  name: string;
  webUrl?: string;
  lastModifiedDateTime: string;
  file?: { mimeType?: string };
}

async function graphFetch<T>(url: string, providerToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Microsoft Graph API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchOutlookMessages(providerToken: string, top = 25): Promise<OutlookMessage[]> {
  const params = new URLSearchParams({
    $top: String(top),
    $select: "id,subject,bodyPreview,receivedDateTime,importance,from",
    $orderby: "receivedDateTime DESC",
  });

  const data = await graphFetch<{ value?: OutlookMessage[] }>(
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
    providerToken
  );

  return data.value ?? [];
}

export async function fetchOneDriveItems(providerToken: string, top = 25): Promise<OneDriveItem[]> {
  const params = new URLSearchParams({
    $top: String(top),
    $select: "id,name,webUrl,lastModifiedDateTime,file",
    $orderby: "lastModifiedDateTime DESC",
  });

  const data = await graphFetch<{ value?: OneDriveItem[] }>(
    `https://graph.microsoft.com/v1.0/me/drive/root/children?${params.toString()}`,
    providerToken
  );

  return (data.value ?? []).filter((item) => Boolean(item.file));
}
