import { NotebookPen, FileUp } from "lucide-react"
import type { TaxonomyCategory, InputMode } from "./types"

export const MODE_OPTIONS: Array<{
  mode: InputMode
  title: string
  description: string
  icon: typeof NotebookPen
}> = [
  {
    mode: "text_single",
    title: "輸入一筆收支",
    description: "一句話、語音或貼上多筆都可以，系統會自動判斷收支、日期與類別",
    icon: NotebookPen,
  },
  {
    mode: "file_import",
    title: "上傳帳單或檔案",
    description: "照片、Excel、PDF 等檔案會先整理成草稿，再讓你確認",
    icon: FileUp,
  },
]

export const TAXONOMY: TaxonomyCategory[] = [
  { category_key: "business_expense_raw_material", display_name_zh: "原料", domain: "business", direction: "expense", aliases: ["原料", "材料", "批貨", "進貨", "食材", "咖啡豆", "成本"], examples: ["買材料 900", "進貨 12000"], rules: ["material", "inventory"] },
  { category_key: "business_expense_marketing", display_name_zh: "行銷廣告", domain: "business", direction: "expense", aliases: ["行銷", "廣告", "dm", "名片", "招牌", "宣傳"], examples: ["廣告費 3000"], rules: ["marketing"] },
  { category_key: "business_expense_variable_other", display_name_zh: "變動其他", domain: "business", direction: "expense", aliases: ["交通費", "工讀生", "臨時人力", "變動其他"], examples: ["工讀生薪資 2000"], rules: ["variable_other"] },
  { category_key: "business_expense_repayment", display_name_zh: "還款", domain: "business", direction: "expense", aliases: ["信扶", "進貨貸款", "創業貸款", "還款"], examples: ["信扶專案貸款還款 5000"], rules: ["business_repayment"] },
  { category_key: "business_expense_extra_other", display_name_zh: "額外其他", domain: "business", direction: "expense", aliases: ["無法分類", "額外其他", "其他支出"], examples: ["其他支出 800"], rules: ["business_other_expense"] },
  { category_key: "business_expense_gas", display_name_zh: "瓦斯", domain: "business", direction: "expense", aliases: ["瓦斯", "天然氣"], examples: ["瓦斯費 700"], rules: ["gas"] },
  { category_key: "business_income_secondhand_equipment_sale", display_name_zh: "二手設備出售", domain: "business", direction: "income", aliases: ["二手設備出售", "出售舊設備", "賣設備"], examples: ["出售舊設備收入 15000"], rules: ["asset_sale"] },
  { category_key: "business_income_space_rent", display_name_zh: "場地出租", domain: "business", direction: "income", aliases: ["場地出租", "出租攤位", "店面分租"], examples: ["場地出租收入 5000"], rules: ["space_rent"] },
  { category_key: "business_expense_utilities", display_name_zh: "水電", domain: "business", direction: "expense", aliases: ["水電", "電費", "水費", "營業用電"], examples: ["水電費 3200"], rules: ["utility"] },
  { category_key: "business_income_service", display_name_zh: "服務提供收入", domain: "business", direction: "income", aliases: ["服務提供收入", "服務收入", "顧問收入", "教學收入"], examples: ["提供設計服務收入 8000"], rules: ["service_income"] },
  { category_key: "business_expense_communication", display_name_zh: "通訊", domain: "business", direction: "expense", aliases: ["通訊", "店內電話", "營業網路", "網路費"], examples: ["店內網路費 1299"], rules: ["communication"] },
  { category_key: "business_expense_rent", display_name_zh: "租金", domain: "business", direction: "expense", aliases: ["店租", "攤位租金", "租金", "場租"], examples: ["店租 18000"], rules: ["rent"] },
  { category_key: "business_expense_consumables", display_name_zh: "耗材", domain: "business", direction: "expense", aliases: ["耗材", "收據", "文具", "清潔用品"], examples: ["清潔用品 600"], rules: ["consumables"] },
  { category_key: "business_expense_fixed_other", display_name_zh: "固定其他", domain: "business", direction: "expense", aliases: ["固定其他", "營業稅", "會計費"], examples: ["會計費 3000"], rules: ["fixed_other"] },
  { category_key: "business_expense_shipping", display_name_zh: "運費", domain: "business", direction: "expense", aliases: ["運費", "宅配", "郵資", "快遞"], examples: ["宅配費 450"], rules: ["shipping"] },
  { category_key: "business_income_product_sale", display_name_zh: "商品銷售收入", domain: "business", direction: "income", aliases: ["商品銷售收入", "賣貨", "銷售", "營收", "出貨收入"], examples: ["今日賣貨 3200"], rules: ["product_sale"] },
  { category_key: "business_expense_hr", display_name_zh: "人事", domain: "business", direction: "expense", aliases: ["人事", "會計師", "助理", "工會", "薪資支出"], examples: ["助理薪資 22000"], rules: ["hr"] },
  { category_key: "business_expense_packaging", display_name_zh: "包材", domain: "business", direction: "expense", aliases: ["包材", "塑膠袋", "免洗餐具", "外帶盒"], examples: ["外帶盒 1200"], rules: ["packaging"] },
  { category_key: "business_expense_equipment_repair", display_name_zh: "器材修繕", domain: "business", direction: "expense", aliases: ["器材修繕", "設備維修", "故障維修"], examples: ["咖啡機維修 3500"], rules: ["equipment_repair"] },
  { category_key: "business_expense_equipment_purchase", display_name_zh: "設備添購", domain: "business", direction: "expense", aliases: ["設備添購", "買機器", "設備採購", "器材購入"], examples: ["購買封口機 12000"], rules: ["equipment_purchase"] },
  { category_key: "business_income_revenue_share", display_name_zh: "合作分潤", domain: "business", direction: "income", aliases: ["合作分潤", "分成收入", "聯名分潤"], examples: ["合作分潤 6000"], rules: ["revenue_share"] },
  { category_key: "business_income_other_entrepreneurial", display_name_zh: "其他創業相關收入", domain: "business", direction: "income", aliases: ["其他創業相關收入", "其他營業收入"], examples: ["其他營業收入 2000"], rules: ["business_other_income"] },
  { category_key: "life_income_savings", display_name_zh: "儲蓄", domain: "life", direction: "income", aliases: ["儲蓄", "存錢", "存入"], examples: ["儲蓄 5000"], rules: ["savings"] },
  { category_key: "life_income_interest", display_name_zh: "利息收入", domain: "life", direction: "income", aliases: ["利息收入", "利息"], examples: ["利息收入 320"], rules: ["interest_income"] },
  { category_key: "life_income_gov_subsidy", display_name_zh: "政府定期補助", domain: "life", direction: "income", aliases: ["政府定期補助", "補助", "津貼"], examples: ["政府補助 2400"], rules: ["gov_subsidy"] },
  { category_key: "life_income_rent", display_name_zh: "租金收入", domain: "life", direction: "income", aliases: ["租金收入", "房租收入", "出租收入"], examples: ["租金收入 12000"], rules: ["life_rent_income"] },
  { category_key: "life_expense_medical", display_name_zh: "醫療", domain: "life", direction: "expense", aliases: ["醫療", "看醫生", "掛號費", "成藥", "醫療器材"], examples: ["看醫生 500"], rules: ["medical"] },
  { category_key: "life_expense_telecom", display_name_zh: "電信", domain: "life", direction: "expense", aliases: ["電信", "手機月租", "電話費", "網路費"], examples: ["手機月租 999"], rules: ["telecom"] },
  { category_key: "life_expense_repayment", display_name_zh: "還款", domain: "life", direction: "expense", aliases: ["信用卡", "車貸", "房貸", "信貸", "還款"], examples: ["信用卡還款 8000"], rules: ["life_repayment"] },
  { category_key: "life_expense_savings", display_name_zh: "儲蓄", domain: "life", direction: "expense", aliases: ["儲蓄", "存錢", "定存", "儲金", "零存整付"], examples: ["儲蓄 5000"], rules: ["life_savings"] },
  { category_key: "life_income_family_gift", display_name_zh: "親友贈與", domain: "life", direction: "income", aliases: ["親友贈與", "贈與", "家人給", "紅包收入"], examples: ["親友贈與 3000"], rules: ["family_gift"] },
  { category_key: "life_expense_education", display_name_zh: "育", domain: "life", direction: "expense", aliases: ["育", "教育費", "學雜費", "補習", "小孩生活費"], examples: ["學費 12000"], rules: ["education"] },
  { category_key: "life_income_pension", display_name_zh: "退休金/年金", domain: "life", direction: "income", aliases: ["退休金", "年金"], examples: ["年金入帳 15000"], rules: ["pension"] },
  { category_key: "life_income_other", display_name_zh: "其他生活收入", domain: "life", direction: "income", aliases: ["其他生活收入", "其他收入"], examples: ["其他收入 1200"], rules: ["life_other_income"] },
  { category_key: "life_expense_clothing", display_name_zh: "衣", domain: "life", direction: "expense", aliases: ["衣", "衣褲", "剪髮", "保養品", "鞋子"], examples: ["買衣服 1800"], rules: ["clothing"] },
  { category_key: "life_income_investment", display_name_zh: "定期投資收益", domain: "life", direction: "income", aliases: ["定期投資收益", "投資收益", "配息"], examples: ["投資收益 2600"], rules: ["investment_income"] },
  { category_key: "life_expense_food", display_name_zh: "食", domain: "life", direction: "expense", aliases: ["食", "三餐", "零食", "飲品", "買菜", "晚餐", "早餐"], examples: ["午餐 120"], rules: ["food"] },
  { category_key: "life_expense_other", display_name_zh: "其他", domain: "life", direction: "expense", aliases: ["其他", "請客", "個人進修", "給父母生活費", "宗教奉獻", "紅包"], examples: ["其他支出 700"], rules: ["life_other_expense"] },
  { category_key: "life_expense_fun", display_name_zh: "樂", domain: "life", direction: "expense", aliases: ["樂", "電影", "遊樂園", "展覽", "娛樂"], examples: ["電影 320"], rules: ["fun"] },
  { category_key: "life_expense_insurance", display_name_zh: "保險(月繳)", domain: "life", direction: "expense", aliases: ["保險", "健保", "壽險", "醫療險", "保險(月繳)"], examples: ["保險月繳 2200"], rules: ["insurance"] },
  { category_key: "life_expense_housing", display_name_zh: "住", domain: "life", direction: "expense", aliases: ["住", "房租", "生活用品", "居家用品"], examples: ["房租 15000"], rules: ["housing"] },
  { category_key: "life_income_temp_work", display_name_zh: "臨時性工作", domain: "life", direction: "income", aliases: ["臨時性工作", "打工收入", "日薪"], examples: ["臨時工作 2000"], rules: ["temp_work_income"] },
  { category_key: "life_income_side_hustle", display_name_zh: "副業收入", domain: "life", direction: "income", aliases: ["副業收入", "接案收入", "兼職收入"], examples: ["副業收入 5000"], rules: ["side_hustle_income"] },
  { category_key: "life_expense_transport", display_name_zh: "行", domain: "life", direction: "expense", aliases: ["行", "油錢", "維修保養", "大眾運輸", "捷運", "公車", "uber", "交通"], examples: ["捷運 30"], rules: ["transport"] },
  { category_key: "life_income_salary", display_name_zh: "薪資收入", domain: "life", direction: "income", aliases: ["薪資收入", "薪水", "月薪", "薪資"], examples: ["薪資收入 42000"], rules: ["salary_income"] },
]

export const CATEGORY_BY_KEY = new Map(TAXONOMY.map(item => [item.category_key, item]))

export const LIFE_EXPENSE_ORDER = [
  "life_expense_food",
  "life_expense_clothing",
  "life_expense_housing",
  "life_expense_transport",
  "life_expense_education",
  "life_expense_fun",
  "life_expense_telecom",
  "life_expense_insurance",
  "life_expense_medical",
  "life_expense_repayment",
  "life_expense_savings",
  "life_expense_other",
]

export const TAXONOMY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "生意收入",
    keys: [
      "business_income_product_sale",
      "business_income_service",
      "business_income_revenue_share",
      "business_income_space_rent",
      "business_income_secondhand_equipment_sale",
      "business_income_other_entrepreneurial",
    ],
  },
  {
    label: "生意支出",
    keys: [
      "business_expense_raw_material",
      "business_expense_packaging",
      "business_expense_marketing",
      "business_expense_shipping",
      "business_expense_hr",
      "business_expense_rent",
      "business_expense_utilities",
      "business_expense_gas",
      "business_expense_communication",
      "business_expense_consumables",
      "business_expense_equipment_purchase",
      "business_expense_equipment_repair",
      "business_expense_fixed_other",
      "business_expense_variable_other",
      "business_expense_repayment",
      "business_expense_extra_other",
    ],
  },
  {
    label: "生活收入",
    keys: [
      "life_income_salary",
      "life_income_side_hustle",
      "life_income_temp_work",
      "life_income_gov_subsidy",
      "life_income_family_gift",
      "life_income_pension",
      "life_income_rent",
      "life_income_interest",
      "life_income_investment",
      "life_income_savings",
      "life_income_other",
    ],
  },
  {
    label: "生活支出",
    keys: [
      "life_expense_food",
      "life_expense_clothing",
      "life_expense_housing",
      "life_expense_transport",
      "life_expense_education",
      "life_expense_fun",
      "life_expense_telecom",
      "life_expense_insurance",
      "life_expense_medical",
      "life_expense_repayment",
      "life_expense_savings",
      "life_expense_other",
    ],
  },
]
