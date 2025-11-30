import { useState, useEffect } from "react";
import { dashboardApi } from "@/api/mockApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Phone, Zap, Circle, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { formatDistance } from "date-fns";
import { RefreshButton } from "@/components/RefreshButton";
import { getQuestionStatistics } from "@/services/customerService";
import { QuestionStats } from "@/services/openai";
import { useToast } from "@/hooks/use-toast";

// List of questions to track
const QUESTIONS_LIST = [
  "How do I reset my password?",
  "I didn't get the password reset email — can you resend it?",
  "Why does my login link keep expiring?",
  "Can I log in with a different email than I signed up with?",
  "How do I change the email address tied to my account?",
  "Why does it say \"invalid email\" when I try to log in?",
  "Can you confirm which email my account is registered under?",
  "I created an account but I can't log in — what's wrong?",
  "Can multiple team members log in at the same time?",
  "How do I add another user to my brand account?",
  "Can I share my login with my assistant safely?",
  "Do you offer two-factor authentication for logins?",
  "Why does it keep asking me to verify my email every time?",
  "I never got the verification email — can you resend it?",
  "The verification link doesn't work — what should I do?",
  "How do I verify my account if my email firewall blocks messages?",
  "Can you verify my account manually?",
  "I entered the wrong email at signup — how can I fix it?",
  "I forgot which email I used — how can I recover my account?",
  "Can you merge two accounts into one?",
  "How do I delete an old account I don't use?",
  "Can I transfer my brand account to another owner?",
  "What happens if I lose access to my email — can I still log in?",
  "Why am I seeing \"account suspended\"?",
  "How do I reactivate my suspended account?",
  "What would cause an account to be suspended?",
  "Can I appeal a suspension?",
  "How do I avoid suspension in the future?",
  "Is there a mobile app for logging in?",
  "Can I log in from my phone browser?",
  "Why does the mobile site not remember my login?",
  "Do you support login via Google or Facebook?",
  "Can I connect my account to Shopify for login?",
  "I can't see my dashboard after logging in — why?",
  "Why does my login say \"no brand found\"?",
  "Can you reset my account manually?",
  "I keep getting redirected back to the login page — why?",
  "Can I have separate logins for different products under my brand?",
  "How do I check if my account is fully set up?",
  "Can I log in with multiple brands under one account?",
  "How do I switch between different brand accounts?",
  "Can I have a personal account and a brand account on the same email?",
  "How do I know if my login is secure?",
  "Can you log me in over the phone if I give you my details?",
  "How do I log out of all devices?",
  "Can I track who has logged into my account?",
  "How often do I need to re-verify my email?",
  "Do logins expire if I don't use the account for a while?",
];

export default function Dashboard() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState({
    totalCalls: 0,
    avgResponseTime: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [liveCalls, setLiveCalls] = useState([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Removed auto-refresh to reduce API calls
    // Data will be cached and only refetched when needed
  }, []);

  const loadDashboardData = async () => {
    const [kpisData, chart, calls] = await Promise.all([
      dashboardApi.getKPIs(),
      dashboardApi.getChartData(),
      dashboardApi.getLiveCalls(),
    ]);
    setKpis(kpisData);
    setChartData(chart);
    setLiveCalls(calls);
  };

  const loadQuestionStatistics = async () => {
    // Prevent multiple simultaneous calls
    if (loadingQuestions) {
      return;
    }
    
    setLoadingQuestions(true);
    try {
      console.log('🚀 Starting question statistics analysis (single API call)...');
      const stats = await getQuestionStatistics(QUESTIONS_LIST);
      setQuestionStats(stats);
      toast({
        title: "✅ Statistics Loaded",
        description: `Analyzed ${stats.reduce((sum, s) => sum + s.count, 0)} question mentions across all calls.`,
      });
    } catch (error: any) {
      console.error('Error loading question statistics:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load question statistics.",
        variant: "destructive",
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const kpiCards = [
    {
      title: "Total Calls",
      value: kpis.totalCalls.toLocaleString(),
      icon: Phone,
      change: "+12.3%",
      color: "text-primary",
    },
    {
      title: "AI Response Time",
      value: `${kpis.avgResponseTime}s`,
      icon: Zap,
      change: "-8.1%",
      color: "text-accent",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "completed":
        return "bg-primary/10 text-primary border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor your AI assistant performance</p>
      </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <Card key={card.title} className="shadow-md hover:shadow-lg transition-shadow" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{card.value}</p>
                  <p className="text-xs text-success mt-1">{card.change} from last month</p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Call Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--secondary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Question Statistics */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Most Asked Questions
            </CardTitle>
            <Button
              onClick={loadQuestionStatistics}
              disabled={loadingQuestions}
              variant="outline"
              size="sm"
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Analyze Questions
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questionStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Analyze Questions" to see which questions are asked most frequently.</p>
              <p className="text-sm mt-2">This will analyze all call transcripts using AI.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questionStats.filter(s => s.count > 0).length > 0 ? (
                <>
                  {/* Top Questions Chart */}
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={questionStats.filter(s => s.count > 0).slice(0, 10).map(s => ({
                          ...s,
                          questionShort: s.question.length > 60 ? s.question.substring(0, 60) + '...' : s.question,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="questionShort"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          width={350}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: any) => [`${value} times`, "Count"]}
                          labelFormatter={(label: any) => {
                            const stat = questionStats.find(s => s.question.startsWith(label) || label.startsWith(s.question.substring(0, 60)));
                            return stat ? stat.question : label;
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Questions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rank</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Question</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Count</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionStats
                          .filter(s => s.count > 0)
                          .slice(0, 20)
                          .map((stat, index) => (
                            <tr
                              key={stat.question}
                              className="border-b border-border hover:bg-muted/50 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm font-medium">
                                <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                  {index + 1}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm">{stat.question}</td>
                              <td className="py-3 px-4 text-sm text-right font-medium">
                                {stat.count}
                              </td>
                              <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                                {stat.percentage.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No questions found in call transcripts</p>
                  <p className="text-sm">This could mean:</p>
                  <ul className="text-sm mt-2 space-y-1 list-disc list-inside max-w-md mx-auto">
                    <li>No calls have been processed yet</li>
                    <li>Call transcripts don't contain any of the tracked questions</li>
                    <li>Questions were asked in different wording than expected</li>
                  </ul>
                  <p className="text-sm mt-4 text-muted-foreground/80">
                    Make sure you have calls with transcripts in your database.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Calls Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-success animate-pulse" />
            Live & Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Assistant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {liveCalls.map((call: any) => (
                  <tr key={call.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{call.assistantName}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{call.phoneNumber}</td>
                    <td className="py-3 px-4 text-sm">{call.duration}s</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDistance(new Date(call.timestamp), new Date(), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
