export enum DocumentType {
  NFCe = "nfce",
  CupomFiscal = "cupom_fiscal",
  NotaPaulista = "nota_paulista",
  NotaFiscal = "nota_fiscal",
  Desconhecido = "desconhecido",
}

export enum PaymentMethod {
  Dinheiro = "dinheiro",
  Debito = "débito",
  Credito = "crédito",
  Pix = "pix",
}

export interface ReceiptItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ExtractedReceiptDto {
  establishmentName: string;
  cnpj: string | null;
  date: string;
  time: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod | null;
  items: ReceiptItemDto[];
  documentType: DocumentType;
  suggestedCategory: string;
  confidence: number;
  readingIssues: string | null;
  lowConfidence?: boolean;
}

export interface ReceiptScanResponse {
  scanId: string;
  data: ExtractedReceiptDto;
  createdAt: string;
}

export interface ReceiptConfirmRequest {
  scanId: string;
  data: {
    categoryId: string;
    description?: string;
    amount?: number;
    occurredAt?: Date;
    paymentMethod?: PaymentMethod | null;
    merchant?: string | null;
    tags?: string[];
  } & Partial<ExtractedReceiptDto>;
}
