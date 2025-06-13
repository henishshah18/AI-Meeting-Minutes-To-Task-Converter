import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type ExtractedTask } from "@shared/schema";
import { Check, Trash2, X } from "lucide-react";

interface TaskReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedTasks: ExtractedTask[];
  onTasksApproved: () => void;
}

export function TaskReviewModal({
  open,
  onOpenChange,
  extractedTasks,
  onTasksApproved,
}: TaskReviewModalProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ExtractedTask[]>(extractedTasks);

  // Update tasks when extractedTasks prop changes
  useEffect(() => {
    setTasks(extractedTasks);
  }, [extractedTasks]);

  const approveTasksMutation = useMutation({
    mutationFn: async (tasksToApprove: ExtractedTask[]) => {
      const res = await apiRequest("POST", "/api/tasks", { tasks: tasksToApprove });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tasks approved",
        description: `${tasks.length} tasks have been added to your task list.`,
      });
      onTasksApproved();
    },
    onError: (error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTask = (index: number, field: keyof ExtractedTask, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const removeTask = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks);
  };

  const handleApproveAll = () => {
    if (tasks.length === 0) {
      toast({
        title: "No tasks to approve",
        description: "Add at least one task before approving.",
        variant: "destructive",
      });
      return;
    }
    approveTasksMutation.mutate(tasks);
  };

  const addNewTask = () => {
    const newTask: ExtractedTask = {
      task_description: "",
      assignee: "",
      due_date: "",
      priority: "P3"
    };
    setTasks([...tasks, newTask]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Review Extracted Tasks</DialogTitle>
          <DialogDescription>
            Review and edit the tasks extracted from your meeting transcript before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto px-1">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <Card key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor={`description-${index}`} className="text-sm font-medium">
                          Task Description
                        </Label>
                        <Textarea
                          id={`description-${index}`}
                          value={task.task_description}
                          onChange={(e) => updateTask(index, "task_description", e.target.value)}
                          rows={2}
                          className="mt-2 resize-none rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`assignee-${index}`} className="text-sm font-medium">
                          Assignee
                        </Label>
                        <Input
                          id={`assignee-${index}`}
                          value={task.assignee}
                          onChange={(e) => updateTask(index, "assignee", e.target.value)}
                          className="mt-2 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`due-date-${index}`} className="text-sm font-medium">
                          Due Date
                        </Label>
                        <Input
                          id={`due-date-${index}`}
                          type="datetime-local"
                          value={formatDateForInput(task.due_date)}
                          onChange={(e) => updateTask(index, "due_date", e.target.value)}
                          className="mt-2 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`priority-${index}`} className="text-sm font-medium">
                          Priority
                        </Label>
                        <Select 
                          value={task.priority} 
                          onValueChange={(value) => updateTask(index, "priority", value)}
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
                      
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          onClick={() => removeTask(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
          <div className="text-sm text-gray-600">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} found
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleApproveAll}
              disabled={approveTasksMutation.isPending || tasks.length === 0}
              className="rounded-lg shadow-lg"
            >
              <Check className="h-4 w-4 mr-2" />
              {approveTasksMutation.isPending ? "Approving..." : "Approve All Tasks"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
