"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
class TransactionController {
    constructor(transactionService) {
        this.transactionService = transactionService;
        this.create = async (req, res) => {
            const transaction = await this.transactionService.create(req.user.userId, req.body);
            res.status(201).json(transaction);
        };
        this.list = async (req, res) => {
            const transactions = await this.transactionService.list(req.user.userId, req.query);
            res.status(200).json(transactions);
        };
        this.getById = async (req, res) => {
            const transaction = await this.transactionService.getById(req.user.userId, this.getIdFromParams(req));
            res.status(200).json(transaction);
        };
        this.update = async (req, res) => {
            const transaction = await this.transactionService.update(req.user.userId, this.getIdFromParams(req), req.body);
            res.status(200).json(transaction);
        };
        this.delete = async (req, res) => {
            await this.transactionService.delete(req.user.userId, this.getIdFromParams(req));
            res.status(204).send();
        };
    }
    getIdFromParams(req) {
        const rawId = req.params.id;
        return Array.isArray(rawId) ? rawId[0] : rawId;
    }
}
exports.TransactionController = TransactionController;
