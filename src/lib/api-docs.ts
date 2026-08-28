/**
 * API reference content — single source of truth for the public docs page.
 * Every endpoint is documented from its actual implementation.
 */

export interface ApiEndpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  auth: string;
  permissions?: string[];
  request?: {
    headers?: Record<string, string>;
    body?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  response: {
    success: string;
    error?: string;
  };
}

export const apiEndpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/generate",
    title: "Generate Identity",
    description:
      "Generate satu identitas palsu lengkap dengan nama, gender, tanggal lahir, dan alamat email di salah satu domain aktif.",
    auth: "API Key dengan permission `generate`",
    permissions: ["generate"],
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    },
    response: {
      success: `{
  "firstName": "Sarah",
  "lastName": "Chen",
  "username": "sarachen42",
  "gender": "female",
  "dateOfBirth": "1995-03-17",
  "email": "sarachen42@yourdomain.com",
  "domain": "yourdomain.com"
}`,
      error: `{
  "error": "Tidak ada domain aktif"
}`,
    },
  },
  {
    method: "POST",
    path: "/api/generate/bulk",
    title: "Bulk Generate",
    description:
      "Generate hingga 20 identitas sekaligus. Parameter `count` di query string menentukan jumlah.",
    auth: "API Key dengan permission `generate`",
    permissions: ["generate"],
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
      query: {
        count: "5",
      },
    },
    response: {
      success: `{
  "count": 5,
  "identities": [
    {
      "firstName": "Alex",
      "lastName": "Rivera",
      "username": "alex.rivera",
      "gender": "male",
      "dateOfBirth": "1998-11-23",
      "email": "alex.rivera@yourdomain.com",
      "domain": "yourdomain.com"
    }
    // ... 4 more
  ]
}`,
    },
  },
  {
    method: "GET",
    path: "/api/inbox/{email}",
    title: "List Inbox",
    description:
      "Ambil daftar email yang diterima di satu alamat. Mendukung paginasi dengan `page` dan `limit`.",
    auth: "API Key dengan permission `inbox`",
    permissions: ["inbox"],
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
      params: {
        email: "user@yourdomain.com",
      },
      query: {
        page: "1",
        limit: "20",
      },
    },
    response: {
      success: `{
  "emails": [
    {
      "id": "abc123",
      "from": "sender@example.com",
      "fromName": "Sender Name",
      "subject": "Welcome!",
      "preview": "Thanks for signing up...",
      "receivedAt": 1704067200,
      "isRead": false,
      "label": "verification",
      "otpCode": "123456",
      "hasAttachments": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}`,
    },
  },
  {
    method: "GET",
    path: "/api/inbox/view/{id}",
    title: "View Email",
    description:
      "Baca email lengkap dengan body HTML/text, headers, dan daftar lampiran. Otomatis menandai email sebagai sudah dibaca.",
    auth: "API Key dengan permission `inbox`",
    permissions: ["inbox"],
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
      params: {
        id: "abc123",
      },
    },
    response: {
      success: `{
  "id": "abc123",
  "messageId": "<msg@example.com>",
  "from": {
    "address": "sender@example.com",
    "name": "Sender Name"
  },
  "to": "user@yourdomain.com",
  "subject": "Welcome!",
  "textBody": "Plain text version...",
  "htmlBody": "<html>...</html>",
  "label": "verification",
  "otpCode": "123456",
  "headers": {
    "content-type": "text/html; charset=utf-8"
  },
  "attachments": [
    {
      "id": "att1",
      "filename": "receipt.pdf",
      "mimeType": "application/pdf",
      "size": 45678,
      "downloadUrl": "/api/inbox/attachment/att1"
    }
  ],
  "receivedAt": 1704067200
}`,
    },
  },
  {
    method: "GET",
    path: "/api/inbox/attachment/{id}",
    title: "Download Attachment",
    description:
      "Download lampiran email. Response berupa file binary dengan header `Content-Disposition: attachment`.",
    auth: "Tidak ada — attachment ID adalah identifier acak yang tidak bisa ditebak",
    request: {
      params: {
        id: "att1",
      },
    },
    response: {
      success: "Binary file dengan header Content-Type dan Content-Disposition yang sesuai.",
      error: `{
  "error": "Lampiran tidak ditemukan"
}`,
    },
  },
  {
    method: "POST",
    path: "/api/alias",
    title: "Create Alias",
    description:
      "Buat alias email custom dengan optional expiration. Alias yang kedaluwarsa akan menolak email masuk dengan status 410.",
    auth: "API Key (permission apa saja)",
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
      },
      body: `{
  "localPart": "myalias",
  "domain": "yourdomain.com",
  "description": "Testing signup flow",
  "expiresInMinutes": 60
}`,
    },
    response: {
      success: `{
  "id": "alias123",
  "address": "myalias@yourdomain.com",
  "expiresAt": "2024-01-01T12:00:00Z"
}`,
      error: `{
  "error": "Alamat sudah digunakan"
}`,
    },
  },
  {
    method: "GET",
    path: "/api/alias",
    title: "List Aliases",
    description: "Ambil semua alias yang pernah dibuat.",
    auth: "API Key (permission apa saja)",
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    },
    response: {
      success: `{
  "aliases": [
    {
      "id": "alias123",
      "address": "myalias@yourdomain.com",
      "localPart": "myalias",
      "domainId": "domain1",
      "description": "Testing signup flow",
      "expiresAt": 1704067200,
      "isActive": true,
      "createdAt": 1704063600
    }
  ]
}`,
    },
  },
  {
    method: "DELETE",
    path: "/api/alias",
    title: "Delete Alias",
    description: "Hapus alias. Email yang dikirim ke alias ini setelah dihapus tidak akan diterima.",
    auth: "API Key (permission apa saja)",
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
      },
      body: `{
  "id": "alias123"
}`,
    },
    response: {
      success: `{
  "success": true
}`,
    },
  },
  {
    method: "POST",
    path: "/api/reply",
    title: "Reply to Email",
    description:
      "Siapkan balasan email. Memerlukan konfigurasi SMTP di dashboard. Response mengembalikan detail SMTP yang dikonfigurasi.",
    auth: "API Key (permission apa saja)",
    request: {
      headers: {
        Authorization: "Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "Content-Type": "application/json",
      },
      body: `{
  "emailId": "abc123",
  "from": "user@yourdomain.com",
  "to": "sender@example.com",
  "subject": "Re: Welcome!",
  "body": "Reply content here",
  "isHtml": false
}`,
    },
    response: {
      success: `{
  "status": "prepared",
  "message": "Email siap dikirim. Konfigurasi SMTP diperlukan untuk pengiriman aktual.",
  "data": {
    "from": "user@yourdomain.com",
    "to": "sender@example.com",
    "subject": "Re: Welcome!",
    "body": "Reply content here",
    "isHtml": false,
    "replyContext": {
      "originalFrom": "sender@example.com",
      "originalSubject": "Welcome!",
      "originalDate": 1704067200
    },
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "user": "user@yourdomain.com"
    }
  }
}`,
      error: `{
  "error": "SMTP belum dikonfigurasi. Atur di Pengaturan untuk mengirim email.",
  "smtpRequired": true
}`,
    },
  },
];

export const authGuide = `
## Authentication

Semua endpoint publik menggunakan **API Key** yang dikirim melalui header \`Authorization\`:

\`\`\`
Authorization: Bearer tm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

### Generate API Key

1. Login ke dashboard di \`/dashboard\`
2. Buka **Kunci API** dari sidebar
3. Klik **Buat Kunci API Baru**
4. Pilih permission yang dibutuhkan:
   - \`generate\` — akses ke \`/api/generate\` dan \`/api/generate/bulk\`
   - \`inbox\` — akses ke \`/api/inbox/*\`
5. Simpan key yang muncul — hanya ditampilkan sekali

### Rate Limiting

Setiap API key memiliki rate limit per menit (default 100 request/menit). Header response menunjukkan sisa quota:

\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
\`\`\`

Jika terlampaui, server mengembalikan **429 Too Many Requests**:

\`\`\`json
{
  "error": "Rate limit terlampaui. Coba lagi nanti."
}
\`\`\`

### IP Allowlist

Secara opsional, key dapat dibatasi hanya untuk IP tertentu. Konfigurasi di dashboard saat membuat atau edit key.
`;

export const quickStart = `
## Quick Start

### 1. Generate Identity

\`\`\`bash
curl -X POST https://yourdomain.com/api/generate \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

**Response:**
\`\`\`json
{
  "firstName": "Maya",
  "lastName": "Patel",
  "username": "maya.patel",
  "gender": "female",
  "dateOfBirth": "1992-07-08",
  "email": "maya.patel@yourdomain.com",
  "domain": "yourdomain.com"
}
\`\`\`

### 2. Check Inbox

\`\`\`bash
curl https://yourdomain.com/api/inbox/maya.patel@yourdomain.com \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

**Response:**
\`\`\`json
{
  "emails": [
    {
      "id": "xyz789",
      "from": "noreply@service.com",
      "subject": "Verify your email",
      "otpCode": "482193",
      "receivedAt": 1704067200
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
\`\`\`

### 3. Read Full Email

\`\`\`bash
curl https://yourdomain.com/api/inbox/view/xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

**Response:**
\`\`\`json
{
  "id": "xyz789",
  "subject": "Verify your email",
  "textBody": "Your verification code is: 482193",
  "htmlBody": "<html>...</html>",
  "otpCode": "482193"
}
\`\`\`
`;

export const errorCodes = `
## Error Handling

Semua error mengembalikan JSON dengan field \`error\`:

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request | Periksa format request body |
| 401 | Unauthorized | API key salah atau kedaluwarsa |
| 403 | Forbidden | Permission tidak mencukupi atau IP tidak diizinkan |
| 404 | Not Found | Resource tidak ditemukan |
| 410 | Gone | Alias kedaluwarsa — buat alias baru |
| 429 | Too Many Requests | Tunggu sebentar, rate limit terlampaui |
| 500 | Internal Server Error | Coba lagi atau hubungi admin |
| 503 | Service Unavailable | Tidak ada domain aktif atau LLM belum dikonfigurasi |
`;
