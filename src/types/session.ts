export interface OpenSessionPayload {
  openingAmount: number;
  note?: string;
}

export interface CloseSessionPayload {
  closingAmount: number;
  note?: string;
}

export interface OpenSessionResponse {
  message: string;
  id?: string;
}
export interface CloseSessionResponse {
  message: string;
  expectedAmount: number;
}
