"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
class CategoryController {
    constructor(categoryService) {
        this.categoryService = categoryService;
        this.list = async (req, res) => {
            const categories = await this.categoryService.list(req.user.userId, req.query);
            res.status(200).json(categories);
        };
        this.create = async (req, res) => {
            const category = await this.categoryService.create(req.user.userId, req.body);
            res.status(201).json(category);
        };
        this.suggest = async (req, res) => {
            const suggestion = await this.categoryService.suggest(req.user.userId, req.query);
            res.status(200).json(suggestion);
        };
        this.update = async (req, res) => {
            const category = await this.categoryService.update(req.user.userId, this.getIdFromParams(req), req.body);
            res.status(200).json(category);
        };
        this.delete = async (req, res) => {
            await this.categoryService.delete(req.user.userId, this.getIdFromParams(req));
            res.status(204).send();
        };
    }
    getIdFromParams(req) {
        const rawId = req.params.id;
        return Array.isArray(rawId) ? rawId[0] : rawId;
    }
}
exports.CategoryController = CategoryController;
