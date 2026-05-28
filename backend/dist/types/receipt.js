"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.DocumentType = void 0;
var DocumentType;
(function (DocumentType) {
    DocumentType["NFCe"] = "nfce";
    DocumentType["CupomFiscal"] = "cupom_fiscal";
    DocumentType["NotaPaulista"] = "nota_paulista";
    DocumentType["NotaFiscal"] = "nota_fiscal";
    DocumentType["Desconhecido"] = "desconhecido";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["Dinheiro"] = "dinheiro";
    PaymentMethod["Debito"] = "d\u00E9bito";
    PaymentMethod["Credito"] = "cr\u00E9dito";
    PaymentMethod["Pix"] = "pix";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
