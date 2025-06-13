import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Task } from "@shared/schema";
import { Save, X } from "lucide-react";

interface TaskEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export function TaskEditModal({
  open,
  onOpenChange,
  task,
}: TaskEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: "",
    assignee: "",
    dueDateLocal: "",
    priority: "P3" as "P1" | "P2" | "P3" | "P4",
  });

  // Update form data when task prop changes
  useEffect(() => {
    if (task) {
      setFormData({
        description: task.description,
        assignee: task.assignee,
        dueDateLocal: (task as any).dueDateLocal || "",
        priority: task.priority as "P1" | "P2" | "P3" | "P4",
      });
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task) throw new Error("No task selected");
      const res = await apiRequest("PUT", `/api/tasks/${task.id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.description.trim()) {
      toast({
        title: "Validation error",
        description: "Task description is required.",
        variant: "destructive",
      });
      return;
    }

    updateTaskMutation.mutate({
      description: formData.description,
      assignee: formData.assignee,
      priority: formData.priority,
    });
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Task Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData("description", e.target.value)}
              rows={3}
              className="mt-2 resize-none rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assignee" className="text-sm font-medium">
                Assignee
              </Label>
              <Input
                id="assignee"
                value={formData.assignee}
                onChange={(e) => updateFormData("assignee", e.target.value)}
                className="mt-2 rounded-lg"
              />
            </div>
            
            <div>
              <Label htmlFor="due-date" className="text-sm font-medium">
                Due Date
              </Label>
              <Input
                id="due-date"
                type="text"
                value={formData.dueDateLocal}
                onChange={(e) => updateFormData("dueDateLocal", e.target.value)}
                placeholder="e.g., Tomorrow at 5pm, Friday afternoon"
                className="mt-2 rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="priority" className="text-sm font-medium">
              Priority
            </Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => updateFormData("priority", value)}
            >
              <SelectTrigger className="mt-2 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P1">P1 - Critical</SelectItem>
                <SelectItem value="P2">P2 - High</SelectItem>
                <SelectItem value="P3">P3 - Medium</SelectItem>
                <SelectItem value="P4">P4 - Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateTaskMutation.isPending}
            className="rounded-lg shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}