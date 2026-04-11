# Documenso Remix App Structure

```mermaid
flowchart TB
    subgraph App["app/"]
        RootTSX["root.tsx"]
        EntryClient["entry.client.tsx"]
        EntryServer["entry.server.tsx"]
        RoutesTS["routes.ts"]
    end

    subgraph Components["components/"]
        Dialogs["dialogs/ - modals"]
        Embed["embed/ - authoring, multisign"]
        Forms["forms/ - 2fa, editor"]
        General["general/ - document-signing, envelope-editor"]
        Tables["tables/"]
    end

    subgraph Routes["routes/"]
        Auth["_authenticated+ - dashboard, teams, docs, templates"]
        Recipient["_recipient+ - sign, download"]
        Unauth["_unauthenticated+ - signin, signup, reset"]
        API["api+ - health, avatar, webhook"]
        EmbedR["embed+ - v0/v1 signing"]
        Share["_share+ - public share"]
    end

    subgraph Server["server/"]
        Main["main.js"]
        Router["router.ts"]
        FilesAPI["api/files - upload, presign"]
        DownloadAPI["api/download"]
        TRPC["trpc - Hono + OpenAPI"]
    end

    App --> Components
    App --> Routes
```

```mermaid
flowchart LR
    subgraph RouteGroups["Route Groups"]
        A["_authenticated+"]
        R["_recipient+"]
        U["_unauthenticated+"]
        API["api+"]
        E["embed+"]
    end

    subgraph AuthContent["_authenticated+ content"]
        T["t.$teamUrl - docs, templates"]
        O["o.$orgUrl - org settings"]
        Ad["admin+ - users, orgs"]
        S["settings+ - profile, security"]
    end

    A --> T
    A --> O
    A --> Ad
    A --> S
```

```mermaid
flowchart TB
    subgraph ComponentsDetail["components/ structure"]
        subgraph FormsDetail["forms/"]
            F2FA["2fa/ - authenticator"]
            FEditor["editor/ - field forms"]
            FAuth["signin, signup, reset-password"]
        end
        subgraph GeneralDetail["general/"]
            GSign["document-signing/ - signing UI"]
            GEditor["envelope-editor/ - doc editor"]
            GEnvelope["envelope-signing/ - complete dialog"]
            GDirect["direct-template/ - direct link"]
        end
    end
```

## Route Groups Overview

| Prefix | Purpose |
|--------|---------|
| `_authenticated+` | Logged-in user: dashboard, teams, documents, templates |
| `_recipient+` | Document recipient: signing (`sign.$token`), download (`d.$token`) |
| `_unauthenticated+` | Auth flows: signin, signup, reset-password, verify-email |
| `_share+` | Public share pages |
| `_internal+` | Internal utilities (PDF, audit log) |
| `api+` | API endpoints |
| `embed+` | Embeddable signing/authoring (v0, v1) |

## Key Directories

- **components/dialogs/** - Modal dialogs (team, document, folder, webhook, etc.)
- **components/forms/editor/** - Field type forms for document editor (signature, text, date, etc.)
- **components/general/document-signing/** - Signing page UI (fields, auth, complete)
- **components/general/envelope-editor/** - Document/template editor (upload, fields)
- **server/api/** - File upload, download, presign endpoints
