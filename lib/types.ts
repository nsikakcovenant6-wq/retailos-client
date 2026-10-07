export type ApiErrorBody = {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

export type User = {
  id: number;
  username: string;
  email: string;
  store_id: number | null;
  store_name: string | null;
  created_at: string;
};

export type Product = {
  id: number;
  store_id: number;
  name: string;
  price: string;
  stock_quantity: number;
  low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: number;
  store_id: number;
  product_id: number;
  user_id: number;
  movement_type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  created_at: string;
};

export type Customer = {
  id: number;
  name: string;
  contact: string | null;
  created_at?: string;
};

export type SaleSummary = {
  id: number;
  customer_id: number | null;
  total_amount: string;
  created_at: string;
};

export type Receipt = {
  sale_id: number;
  customer_id: number | null;
  total_amount: string;
  created_at: string;
  items: Array<{
    product_id: number;
    quantity: number;
    price_at_sale?: string;
    total: string;
  }>;
  printable_text: string;
};

export type Alert = {
  id: number;
  type: string;
  message: string;
  product_id: number | null;
  created_at: string;
};

export type DashboardStats = {
  products_count: number;
  low_stock_count: number;
  open_alerts_count: number;
  today_sales_count: number;
  today_sales_total: string;
};

export type DailySummary = {
  date: string;
  sales_count: number;
  total_sales: string;
  sales: SaleSummary[];
};

export type DailyBrief = {
  date: string;
  sales: {
    today_total: string;
    yesterday_total: string;
    change_percent: string;
    status: "UP" | "DOWN" | "STEADY";
  };
  alerts: Array<Pick<Alert, "id" | "type" | "message" | "product_id">>;
  insights: {
    restock_recommendations: Array<{
      product_id: number;
      product_name: string;
      stock_quantity: number;
      low_stock_threshold: number | null;
    }>;
    high_performer: {
      product_id: number;
      product_name: string;
      units_sold: number;
    } | null;
    declining_product: {
      product_id: number;
      product_name: string;
      yesterday_units_sold: number;
      today_units_sold: number;
    } | null;
  };
};
