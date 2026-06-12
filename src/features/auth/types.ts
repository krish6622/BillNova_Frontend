export interface User {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "CASHIER";
}

export interface Tenant {
  id: string;
  business_name: string;
  subscription_status: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  tenant: Tenant;
}

export interface LoginPayload {
  email: string;
  password: string;
}
