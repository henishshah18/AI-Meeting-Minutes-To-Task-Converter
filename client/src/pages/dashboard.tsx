import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskReviewModal } from "@/components/task-review-modal";
import { TaskEditModal } from "@/components/task-edit-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Task, type ExtractedTask } from "@shared/schema";
import { ClipboardList, FileText, ListChecks, LogOut, Edit2, Trash2, Circle, CheckCircle2, Info } from "lucide-react";

const PRIORITY_COLORS = {
  P1: "bg-red-100 text-red-800",
  P2: "bg-orange-100 text-orange-800", 
  P3: "bg-yellow-100 text-yellow-800",
  P4: "bg-green-100 text-green-800",
};

const PRIORITY_LABELS = {
  P1: "P1 - Critical",
  P2: "P2 - High",
  P3: "P3 - Medium", 
  P4: "P4 - Low",
};

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // Fetch user's tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  // Extract tasks mutation
  const extractTasksMutation = useMutation({
    mutationFn: async (transcript: string) => {
      const res = await apiRequest("POST", "/api/extract-tasks", { transcript });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.tasks && data.tasks.length > 0) {
        setExtractedTasks(data.tasks);
        setShowModal(true);
      } else {
        toast({
          title: "No tasks found",
          description: "No actionable tasks were found in the transcript.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const res = await apiRequest("PUT", `/api/tasks/${task.id}`, {
        completed: !task.completed,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtractTasks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) {
      toast({
        title: "No transcript",
        description: "Please enter a meeting transcript first.",
        variant: "destructive",
      });
      return;
    }
    extractTasksMutation.mutate(transcript);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredTasks = priorityFilter 
    ? tasks.filter(task => task.priority === priorityFilter)
    : tasks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center mr-3">
                <ClipboardList className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Task Converter</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>
              </span>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Transcript Input Section */}
          <div className="lg:col-span-1">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-2" />
                  Meeting Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExtractTasks} className="space-y-4">
                  <div>
                    <Label htmlFor="transcript">
                      Paste your meeting transcript below
                    </Label>
                    <Textarea
                      id="transcript"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={12}
                      className="mt-2 resize-none rounded-xl"
                      placeholder={`Paste meeting transcript here... 

Example:
"John will update the database schema by Friday. Sarah needs to review the mockups by tomorrow evening. The team should prepare the presentation slides for next Wednesday's client meeting."`}
                    />
                  </div>

                  <Button 
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={extractTasksMutation.isPending}
                  >
                    {extractTasksMutation.isPending ? (
                      "Extracting Tasks..."
                    ) : (
                      <>
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Extract Tasks
                      </>
                    )}
                  </Button>
                </form>

                {extractTasksMutation.isSuccess && extractedTasks.length > 0 && (
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Found {extractedTasks.length} tasks in transcript. Review and approve to add to your task list.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tasks List Section */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <ListChecks className="h-5 w-5 text-primary mr-2" />
                    Your Tasks
                    <Badge variant="secondary" className="ml-2">
                      {filteredTasks.length}
                    </Badge>
                  </CardTitle>
                  
                  <Select value={priorityFilter || "all"} onValueChange={(value) => setPriorityFilter(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="P1">P1 - Critical</SelectItem>
                      <SelectItem value="P2">P2 - High</SelectItem>
                      <SelectItem value="P3">P3 - Medium</SelectItem>
                      <SelectItem value="P4">P4 - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="text-center py-8">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {tasks.length === 0 ? "No tasks yet" : "No tasks match your filter"}
                    </h3>
                    <p className="text-gray-600">
                      {tasks.length === 0 
                        ? "Paste a meeting transcript and extract tasks to get started."
                        : "Try adjusting your priority filter."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">
                                {task.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(task.assignee)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-gray-700">{task.assignee}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-700">
                                {formatDate(task.dueDateUtc.toString())}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}
                              >
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTaskMutation.mutate(task)}
                                className={
                                  task.completed
                                    ? "text-green-700 hover:text-green-800"
                                    : "text-gray-600 hover:text-gray-700"
                                }
                              >
                                {task.completed ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Circle className="h-4 w-4 mr-1" />
                                    Pending
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTask(task)}
                                  className="text-gray-500 hover:text-blue-600"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="text-gray-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Task Review Modal */}
      <TaskReviewModal
        open={showModal}
        onOpenChange={setShowModal}
        extractedTasks={extractedTasks}
        onTasksApproved={() => {
          setShowModal(false);
          setExtractedTasks([]);
          setTranscript("");
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        task={editingTask}
      />
    </div>
  );
}
