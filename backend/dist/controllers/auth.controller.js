"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.register = async (req, res) => {
            const result = await this.authService.register(req.body);
            res.status(201).json(result);
        };
        this.login = async (req, res) => {
            const result = await this.authService.login(req.body);
            res.status(200).json(result);
        };
    }
}
exports.AuthController = AuthController;
