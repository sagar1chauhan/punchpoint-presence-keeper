import Notification from "../models/Notification.js";
import { sendError, sendSuccess } from "../utils/response.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, notifications.map((n) => n.toJSON()), "Notifications retrieved");
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!notification) {
      return sendError(res, "Notification not found", 404);
    }

    notification.read = true;
    await notification.save();

    return sendSuccess(res, { success: true }, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};
