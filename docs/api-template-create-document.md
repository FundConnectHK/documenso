# 用模板創建合同 API 文檔 (V2)

## 端點

```
POST /api/v2/template/use
```

**認證**：Bearer Token（Header: `Authorization: Bearer <token>`）

---

## 請求體

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `templateId` | number | ✓ | 模板 ID |
| `recipients` | array | ✓ | 簽署人，每項含模板 recipient `id`、`email`、`name`。傳入的 `email`、`name` 會覆蓋模板預設值，用於指定實際簽署人 |
| `distributeDocument` | boolean | | 是否發送給簽署人，預設 false |
| `folderId` | string | | 存放資料夾 ID |
| `customDocumentData` | array | | 替換 PDF，每項 `documentDataId`、`envelopeItemId` |
| `prefillFields` | array | | 預填欄位，見下方 |
| `richTextSigningAreaFieldIds` | number[] | | 簽名欄位 ID，標記為富文本簽署區（每簽署人可多個，如簽名+蓋章） |

---

## 更改簽署人姓名和郵箱

建立合同時，`recipients` 陣列中的 `email` 和 `name` 會覆蓋模板預設值。只需傳入模板簽署人的 `id`（模板 Recipient ID）及新的 `email`、`name` 即可。

**recipients 每項結構：**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | number | ✓ | 模板簽署人 ID（從模板詳情取得） |
| `email` | string | ✓ | 實際簽署人郵箱 |
| `name` | string | | 實際簽署人姓名，不傳則為空字串 |
| `signingOrder` | number | | 簽署順序（可選） |

**範例：** 模板有買方(id:10)、賣方(id:11)，建立時改為張三、李四：

```json
{
  "templateId": 1,
  "recipients": [
    { "id": 10, "email": "zhangsan@example.com", "name": "張三" },
    { "id": 11, "email": "lisi@example.com", "name": "李四" }
  ]
}
```

取得模板簽署人 ID：可透過 `GET /api/v2/template/{templateId}` 取得模板詳情，其中 `recipients` 陣列含各簽署人的 `id`。

---

## 欄位預填（prefillFields）

**可以修改的欄位**：模板中每個簽署人區塊的欄位，只要類型為 TEXT、NUMBER、DATE、RADIO、CHECKBOX、DROPDOWN，都可以透過 `prefillFields` 預填值。欄位透過模板欄位 ID 指定，與所屬簽署人無關——只要知道欄位 ID，即可預填任一簽署人的欄位。

**不能修改的**：SIGNATURE、INITIALS、NAME、EMAIL 由簽署人填寫，不支援 prefill。無法透過 API 新增/刪除欄位、變更欄位所屬簽署人或位置。

取得欄位 ID：透過 `GET /api/v2/template/{templateId}` 取得模板詳情，`recipients[].fields` 或 `fields` 中可取得各欄位的 `id`。

---

## prefillFields：各欄位類型

`id` 為模板欄位 ID，`type` 對應欄位類型。

| 類型 | 說明 | 範例 |
|------|------|------|
| **TEXT** | 文字 | `{ "id": 101, "type": "text", "value": "預填文字" }` |
| **NUMBER** | 數字 | `{ "id": 102, "type": "number", "value": "100" }` |
| **DATE** | 日期（ISO 字串） | `{ "id": 103, "type": "date", "value": "2025-03-09" }` |
| **RADIO** | 單選 | `{ "id": 104, "type": "radio", "value": "選項A" }` 或 `{ "id": 104, "type": "radio", "valueById": 1 }` |
| **CHECKBOX** | 複選 | `{ "id": 105, "type": "checkbox", "value": ["A","B"] }` 或 `{ "id": 105, "type": "checkbox", "valueById": [1,3] }` |
| **DROPDOWN** | 下拉 | `{ "id": 106, "type": "dropdown", "value": "選中項" }` |

---

## 回應

回傳完整 envelope 文檔物件（含 `id`、`recipients`、`envelopeItems` 等）。簽署連結：`recipients[].token` 組合成 `https://app.example.com/sign/{token}`。

---

## 完整範例

```json
POST /api/v2/template/use
Content-Type: application/json
Authorization: Bearer <token>

{
  "templateId": 1,
  "recipients": [
    { "id": 10, "email": "buyer@example.com", "name": "買方" },
    { "id": 11, "email": "seller@example.com", "name": "賣方" }
  ],
  "distributeDocument": true,
  "prefillFields": [
    { "id": 101, "type": "text", "value": "合約編號-2025-001" },
    { "id": 102, "type": "number", "value": "50000" },
    { "id": 103, "type": "date", "value": "2025-03-09" },
    { "id": 104, "type": "radio", "valueById": 2 },
    { "id": 105, "type": "checkbox", "valueById": [1, 3] },
    { "id": 106, "type": "dropdown", "value": "月付" }
  ],
  "richTextSigningAreaFieldIds": [201]
}
```

---

## 富文本內容與欄位佔位符

模板的富文本（`richTextContent`）內含佔位符如 `{{field:101}}`，對應模板欄位 ID。建立合同時會自動處理：

1. **複製富文本**：從模板複製到新文件的 envelope item。
2. **ID 重映射**：新文件的欄位會產生新 ID（如 101→201）。系統會將富文本中的 `{{field:101}}` 替換為 `{{field:201}}`，使佔位符指向新欄位。
3. **簽署頁渲染**：簽署時，`RichTextSigningView` 依佔位符 ID 查詢欄位，並顯示實際內容：
   - SIGNATURE：已簽則顯示簽名圖，未簽則顯示「點擊簽名」按鈕
   - TEXT/NUMBER 等：已預填則顯示 `customText`，未填則顯示輸入框
   - CHECKBOX：顯示勾選狀態

**prefillFields 的影響**：預填值會寫入欄位的 `customText` 或 `fieldMeta`。簽署頁渲染 `{{field:id}}` 時會讀取這些值並顯示，因此 prefill 會反映在富文本區塊中。

---

## 注意

- **SIGNATURE、INITIALS、NAME、EMAIL** 不支援 prefill
- RADIO、CHECKBOX 建議用 `valueById`（選項 ID）較穩定
