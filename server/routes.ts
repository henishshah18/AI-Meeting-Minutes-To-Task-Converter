import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, extractedTaskSchema, type ExtractedTask } from "@shared/schema";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Helper function to convert local time to UTC
function convertLocalToUtc(localTimeString: string, timezone: string): Date {
  // For MVP, we'll use simple date parsing
  // In production, use a proper timezone library like date-fns-tz
  const localDate = new Date(localTimeString);
  return localDate; // For now, assuming input is already in a parseable format
}

// Helper function to convert UTC to local time
function convertUtcToLocal(utcDate: Date, timezone: string): string {
  // For MVP, return ISO string
  // In production, format according to user's timezone
  return utcDate.toISOString();
}

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Extract tasks from meeting transcript using OpenAI
  app.post("/api/extract-tasks", requireAuth, async (req, res) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract ALL actionable tasks from meeting transcript. Be thorough and don't miss any tasks. Return JSON array with objects containing: task_description, assignee, due_date (clean up the date by removing words like 'by', 'before', 'until' - just keep the actual date/time like 'Tomorrow at 5pm', 'Friday afternoon', 'end of week', 'June 20th'), priority (default P3 if not specified, can be P1, P2, P3, or P4). Look for all types of tasks including follow-ups, deliverables, action items, and commitments."
          },
          {
            role: "user",
            content: transcript
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const tasks = result.tasks || [];

      // Validate extracted tasks
      const validatedTasks = tasks.map((task: any) => {
        try {
          return extractedTaskSchema.parse(task);
        } catch (error) {
          // Skip invalid tasks
          return null;
        }
      }).filter(Boolean);

      if (validatedTasks.length === 0) {
        return res.json({ tasks: [], message: "No tasks found" });
      }

      res.json({ tasks: validatedTasks });
    } catch (error) {
      console.error("OpenAI extraction error:", error);
      res.status(500).json({ error: "Failed to extract tasks" });
    }
  });

  // Get all tasks for the authenticated user
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasksByUserId(req.user!.id);
      
      // Convert UTC dates back to user's local timezone for display
      const tasksWithLocalTime = tasks.map(task => ({
        ...task,
        dueDateLocal: convertUtcToLocal(task.dueDateUtc, req.user!.timezone || "UTC")
      }));
      
      res.json(tasksWithLocalTime);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Create new tasks (from approved extracted tasks)
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { tasks: tasksToCreate } = req.body;
      
      if (!Array.isArray(tasksToCreate)) {
        return res.status(400).json({ error: "Tasks array is required" });
      }

      const createdTasks = [];
      
      for (const taskData of tasksToCreate) {
        try {
          // For now, create a default due date if parsing fails
          let dueDateUtc: Date;
          try {
            dueDateUtc = new Date(taskData.due_date);
            if (isNaN(dueDateUtc.getTime())) {
              // If date parsing fails, default to tomorrow
              dueDateUtc = new Date();
              dueDateUtc.setDate(dueDateUtc.getDate() + 1);
            }
          } catch {
            dueDateUtc = new Date();
            dueDateUtc.setDate(dueDateUtc.getDate() + 1);
          }
          
          const taskToInsert = insertTaskSchema.parse({
            userId: req.user!.id,
            description: taskData.task_description,
            assignee: taskData.assignee,
            dueDateUtc,
            dueDateOriginal: taskData.due_date,
            priority: taskData.priority,
            completed: false,
          });

          const createdTask = await storage.createTask(taskToInsert);
          createdTasks.push(createdTask);
        } catch (error) {
          console.error("Error creating task:", error);
          // Continue with other tasks
        }
      }

      res.status(201).json(createdTasks);
    } catch (error) {
      console.error("Create tasks error:", error);
      res.status(500).json({ error: "Failed to create tasks" });
    }
  });

  // Update a task
  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = updateTaskSchema.parse(req.body);
      
      // Convert local time to UTC if due date is being updated
      if (updates.dueDateUtc) {
        updates.dueDateUtc = convertLocalToUtc(updates.dueDateUtc.toISOString(), req.user!.timezone || "UTC");
      }

      const updatedTask = await storage.updateTask(taskId, req.user!.id, updates);
      
      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const deleted = await storage.deleteTask(taskId, req.user!.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
