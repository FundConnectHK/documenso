/**
 * 使用真實模板數據，透過 /api/v2/template/use 創建合同
 * 運行:
 *   --list              列出所有模板
 *   --curl              輸出 curl 命令
 *   --template=9        指定模板 ID
 *   --title=三方         按標題篩選模板
 *   --distribute         創建後直接發送（PENDING 狀態）
 *   --date=2025-03-09    預填日期欄位
 *
 * 使用自己的 API Token:
 *   DOCUMENSO_API_TOKEN=api_xxx npx tsx scripts/create-document-from-template-api.ts --curl
 */
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { EnvelopeType } from '@documenso/prisma/client';

const BASE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000';

async function listTemplates() {
  const searchTitle = process.argv.find((a) => a.startsWith('--title='))?.slice(8);
  const templates = await prisma.envelope.findMany({
    where: {
      type: EnvelopeType.TEMPLATE,
      ...(searchTitle ? { title: { contains: searchTitle, mode: 'insensitive' } } : {}),
    },
    include: { recipients: true },
    orderBy: { createdAt: 'desc' },
  });

  if (templates.length === 0) {
    console.error(searchTitle ? `未找到標題包含「${searchTitle}」的模板` : '未找到模板');
    process.exit(1);
  }

  console.log(`共 ${templates.length} 個模板:\n`);
  for (const t of templates) {
    const templateId = mapSecondaryIdToTemplateId(t.secondaryId);
    console.log(`  ID: ${templateId}  標題: ${t.title}`);
    if (t.recipients?.length) {
      t.recipients.forEach((r) => {
        console.log(`    簽署人 id=${r.id}  ${r.name ?? ''} <${r.email}>`);
      });
    }
    console.log('');
  }
}

async function main() {
  if (process.argv.includes('--list')) {
    await listTemplates();
    return;
  }

  const templateIdArg = process.argv.find((a) => a.startsWith('--template='))?.slice(11);
  const templateTitleArg = process.argv.find((a) => a.startsWith('--title='))?.slice(7);

  const template = await prisma.envelope.findFirst({
    where: {
      type: EnvelopeType.TEMPLATE,
      ...(templateIdArg
        ? { secondaryId: templateIdArg.startsWith('template_') ? templateIdArg : `template_${templateIdArg}` }
        : {}),
      ...(templateTitleArg ? { title: { contains: templateTitleArg, mode: 'insensitive' } } : {}),
      ...(!templateIdArg && !templateTitleArg ? { title: { not: { contains: '[TEST]' } } } : {}),
    },
    include: {
      recipients: { include: { fields: true } },
      envelopeItems: true,
      user: true,
    },
  });

  if (!template) {
    console.error('未找到模板。可用 --list 查看，或 --template=9 --title=三方 指定。');
    process.exit(1);
  }

  let token = process.env.DOCUMENSO_API_TOKEN;
  if (!token) {
    try {
      const created = await createApiToken({
        userId: template.userId,
        teamId: template.teamId,
        tokenName: 'template-use',
        expiresIn: null,
      });
      token = created.token;
    } catch (err) {
      console.error(
        '創建 Token 失敗（需有團隊管理權限）。請在 Documenso 設置中創建 API Token，然後:\n' +
          '  DOCUMENSO_API_TOKEN=api_你的token npx tsx scripts/create-document-from-template-api.ts --curl',
      );
      process.exit(1);
    }
  }

  const templateId = mapSecondaryIdToTemplateId(template.secondaryId);
  const recipients = template.recipients.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? '',
  }));

  const body: Record<string, unknown> = {
    templateId,
    recipients,
  };

  const distributeDocument = process.argv.includes('--distribute');
  if (distributeDocument) {
    body.distributeDocument = true;
  }

  const prefillDate = process.argv.find((a) => a.startsWith('--date='))?.slice(7);
  if (prefillDate) {
    const dateFieldId = template.recipients
      .flatMap((r) => r.fields ?? [])
      .find((f) => f?.type === 'DATE')?.id;
    if (dateFieldId) {
      body.prefillFields = [{ id: dateFieldId, type: 'date', value: prefillDate }];
    }
  }

  const outputCurl = process.argv.includes('--curl');
  if (outputCurl) {
    const bodyStr = JSON.stringify(body);
    console.log(`curl -X POST "${BASE_URL}/api/v2-beta/template/use" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -d '${bodyStr}'`);
    if (!process.env.DOCUMENSO_API_TOKEN) {
      console.log('\n# 若 Token 無效，請在 Documenso 設置中創建 API Token，然後:');
      console.log('# DOCUMENSO_API_TOKEN=api_你的token 再執行上述命令');
    }
    return;
  }

  console.log('使用模板:', template.title);
  console.log('模板 ID:', templateId);
  console.log('簽署人:', recipients.map((r) => `${r.name} <${r.email}>`).join(', '));
  console.log('\n調用 API...\n');

  const res = await fetch(`${BASE_URL}/api/v2-beta/template/use`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('API 錯誤:', res.status, data);
    process.exit(1);
  }

  console.log('合同創建成功');
  console.log('文檔 ID:', data.id);
  console.log('簽署連結:', data.recipients?.map((r: { token: string }) => `${BASE_URL}/sign/${r.token}`).join('\n         '));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
