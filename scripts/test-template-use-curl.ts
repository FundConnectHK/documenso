/**
 * 創建測試數據並輸出 curl 命令，用於驗證 /api/v2/template/use 的 prefill 和富文本替換
 * 運行: npx tsx scripts/test-template-use-curl.ts
 */
import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { mapSecondaryIdToTemplateId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { FieldType, RecipientRole } from '@documenso/prisma/client';
import { seedBlankTemplate } from '@documenso/prisma/seed/templates';
import { seedUser } from '@documenso/prisma/seed/users';

const BASE_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000';

async function main() {
  const { user, team } = await seedUser();
  const { token } = await createApiToken({
    userId: user.id,
    teamId: team.id,
    tokenName: 'test-template-use',
    expiresIn: null,
  });

  const template = await seedBlankTemplate(user, team.id, {
    createTemplateOptions: { title: 'Test Rich Text Prefill' },
  });

  const firstEnvelopeItem = template.envelopeItems[0];
  if (!firstEnvelopeItem) {
    throw new Error('No envelope item');
  }

  const recipient = await prisma.recipient.create({
    data: {
      envelopeId: template.id,
      email: 'test@example.com',
      name: 'Test User',
      role: RecipientRole.SIGNER,
      token: 'test-token-' + Date.now(),
      readStatus: 'NOT_OPENED',
      sendStatus: 'NOT_SENT',
      signingStatus: 'NOT_SIGNED',
    },
  });

  const textField = await prisma.field.create({
    data: {
      envelopeId: template.id,
      envelopeItemId: firstEnvelopeItem.id,
      recipientId: recipient.id,
      type: FieldType.TEXT,
      page: 1,
      positionX: 5,
      positionY: 5,
      width: 20,
      height: 5,
      customText: '',
      inserted: false,
      fieldMeta: { type: 'text', label: '甲方名稱' },
    },
  });

  await prisma.envelopeItem.update({
    where: { id: firstEnvelopeItem.id },
    data: {
      richTextContent: `<p>甲方：{{field:${textField.id}}}，簽訂本合同。</p>`,
    },
  });

  const templateId = mapSecondaryIdToTemplateId(template.secondaryId);

  console.log('\n=== 測試數據已創建 ===\n');
  console.log('模板 ID:', templateId);
  console.log('文字欄位 ID:', textField.id);
  console.log('API Token:', token);
  console.log('\n=== 執行以下 curl 命令 ===\n');
  console.log(`curl -X POST "${BASE_URL}/api/v2-beta/template/use" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
  "templateId": ${templateId},
  "recipients": [
    { "id": ${recipient.id}, "email": "test@example.com", "name": "Test User" }
  ],
  "prefillFields": [
    { "id": ${textField.id}, "type": "text", "value": "張三" }
  ]
}`);

  console.log('\n=== 驗證方式 ===');
  console.log('1. 創建成功後，從回應取得 documentId');
  console.log('2. 訪問簽署頁面: ' + BASE_URL + '/sign/{recipientToken}');
  console.log('3. 富文本中應顯示「甲方：張三，簽訂本合同。」');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
