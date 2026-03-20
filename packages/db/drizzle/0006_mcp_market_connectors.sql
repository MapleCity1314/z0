INSERT INTO "MCPServer" (
  "name",
  "endpoint",
  "sourceType",
  "metadata",
  "isActive",
  "createdBy",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'Excalidraw',
    'setup://excalidraw',
    'market',
    '{"slug":"excalidraw","icon":"excalidraw","category":"Whiteboard","provider":"Excalidraw","shortDescription":"Sketch diagrams and whiteboard flows through MCP-compatible tooling.","setupLabel":"Requires external setup","docsUrl":"https://excalidraw.com/","tags":["diagram","whiteboard","visual"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'Notion',
    'setup://notion',
    'market',
    '{"slug":"notion","icon":"notion","category":"Knowledge Base","provider":"Notion","shortDescription":"Search, read, and update workspace pages and databases.","setupLabel":"Requires external setup","docsUrl":"https://www.notion.so/product","tags":["docs","wiki","workspace"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'GitHub',
    'setup://github',
    'market',
    '{"slug":"github","icon":"github","category":"Code Hosting","provider":"GitHub","shortDescription":"Work with repositories, pull requests, issues, and code context.","setupLabel":"Requires external setup","docsUrl":"https://github.com/","tags":["repo","pull-request","issues"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'Gmail',
    'setup://gmail',
    'market',
    '{"slug":"gmail","icon":"gmail","category":"Communication","provider":"Google","shortDescription":"Search mailboxes, draft replies, and automate inbox workflows.","setupLabel":"Requires external setup","docsUrl":"https://workspace.google.com/products/gmail/","tags":["email","inbox","google"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'Google Calendar',
    'setup://google-calendar',
    'market',
    '{"slug":"google-calendar","icon":"google-calendar","category":"Scheduling","provider":"Google","shortDescription":"Read schedules, inspect events, and coordinate calendar tasks.","setupLabel":"Requires external setup","docsUrl":"https://workspace.google.com/products/calendar/","tags":["calendar","events","google"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'Google Drive',
    'setup://google-drive',
    'market',
    '{"slug":"google-drive","icon":"google-drive","category":"File Storage","provider":"Google","shortDescription":"Browse files, folders, and shared documents from Drive.","setupLabel":"Requires external setup","docsUrl":"https://workspace.google.com/products/drive/","tags":["drive","files","google"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    'Figma',
    'setup://figma',
    'market',
    '{"slug":"figma","icon":"figma","category":"Design","provider":"Figma","shortDescription":"Pull design context, file metadata, and collaboration surfaces into MCP workflows.","setupLabel":"Requires external setup","docsUrl":"https://www.figma.com/","tags":["design","ui","prototype"],"recommended":true,"requiresSetup":true}',
    true,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT ("endpoint") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "sourceType" = EXCLUDED."sourceType",
  "metadata" = EXCLUDED."metadata",
  "isActive" = true,
  "updatedAt" = NOW();
