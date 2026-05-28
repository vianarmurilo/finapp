"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
class SubscriptionController {
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
        this.create = async (req, res) => {
            const result = await this.subscriptionService.create(req.user.userId, req.body);
            res.status(201).json(result);
        };
        this.list = async (req, res) => {
            const result = await this.subscriptionService.list(req.user.userId);
            res.status(200).json(result);
        };
        this.update = async (req, res) => {
            const subscriptionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const result = await this.subscriptionService.update(req.user.userId, subscriptionId, req.body);
            res.status(200).json(result);
        };
        this.delete = async (req, res) => {
            const subscriptionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await this.subscriptionService.delete(req.user.userId, subscriptionId);
            res.status(204).send();
        };
    }
}
exports.SubscriptionController = SubscriptionController;
