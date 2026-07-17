import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "../components/ui/Table";
import {
  Users,
  Building,
  Mail,
  Send,
  Database,
  ShieldAlert,
  Terminal,
  RefreshCw,
  Trash2,
  Play,
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  XCircle,
  CheckCircle,
  Eye,
  Settings,
  Sun,
  Moon
} from "lucide-react";
import { useStore } from "../store/useStore";

export default function FounderDashboard() {
  const { theme, toggleTheme } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningCommand, setRunningCommand] = useState(null);
  const [specificCampaignId, setSpecificCampaignId] = useState("");

  // Configuration States
  const [configs, setConfigs] = useState([]);
  const [configKey, setConfigKey] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [configDesc, setConfigDesc] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [editingKey, setEditingKey] = useState(null);

  // Dynamic Redis Connection States
  const [redisHost, setRedisHost] = useState("");
  const [redisPort, setRedisPort] = useState("6379");
  const [redisPassword, setRedisPassword] = useState("");
  const [redisStatus, setRedisStatus] = useState("disconnected");
  const [redisError, setRedisError] = useState(null);
  const [savingRedis, setSavingRedis] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [terminalOutput, setTerminalOutput] = useState(
    "==========================================================\n" +
    "         KNOWYOURMAIL FOUNDER ADMINISTRATION CONSOLE       \n" +
    "==========================================================\n" +
    "System ready. Click any QA command to execute on the server.\n\n"
  );
  
  const terminalEndRef = useRef(null);

  const fetchRedisConnection = async () => {
    try {
      const response = await axios.get("/api/founder/redis-connection");
      if (response.data.success) {
        setRedisHost(response.data.connection.host || "");
        setRedisPort(response.data.connection.port || "6379");
        setRedisPassword(response.data.connection.password || "");
        setRedisStatus(response.data.status);
        setRedisError(response.data.error);
      }
    } catch (error) {
      console.error("Failed to fetch Redis connection status", error);
      appendTerminal(`Error fetching Redis connection: ${error.message}\n`);
    }
  };

  const fetchConfigs = async () => {
    try {
      const response = await axios.get("/api/founder/config");
      if (response.data.success) {
        setConfigs(response.data.configs);
      }
    } catch (error) {
      console.error("Failed to fetch configurations", error);
      appendTerminal(`Error fetching configurations: ${error.message}\n`);
    }
  };

  const fetchData = async () => {
    try {
      const response = await axios.get("/api/founder/metrics");
      if (response.data.success) {
        setData(response.data);
      }
      await fetchRedisConnection();
      await fetchConfigs();
    } catch (error) {
      console.error("Failed to fetch founder metrics", error);
      appendTerminal(`Error fetching system metrics: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRedisConnection = async (e) => {
    e.preventDefault();
    if (!redisHost.trim() || !redisPort) return;

    setSavingRedis(true);
    appendTerminal(`$ testing & saving redis connection info for ${redisHost}:${redisPort}...\n`);

    try {
      const response = await axios.post("/api/founder/redis-connection", {
        host: redisHost,
        port: parseInt(redisPort),
        password: redisPassword
      });

      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.message}\n\n`);
        setRedisStatus("connected");
        setRedisError(null);
        fetchConfigs();
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
        setRedisStatus("disconnected");
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      appendTerminal(`[ERROR] Redis connection failed:\n${msg}\n\n`);
      setRedisStatus("disconnected");
      setRedisError(msg);
    } finally {
      setSavingRedis(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configKey.trim() || !configValue.trim()) return;
    
    setSavingConfig(true);
    const cmdStr = `saving setting ${configKey.toUpperCase()}...`;
    appendTerminal(`$ ${cmdStr}\n`);

    try {
      const response = await axios.post("/api/founder/config", {
        key: configKey,
        value: configValue,
        description: configDesc
      });
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.message}\n\n`);
        setConfigKey("");
        setConfigValue("");
        setConfigDesc("");
        setEditingKey(null);
        fetchConfigs();
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
      }
    } catch (error) {
      appendTerminal(`[ERROR] failed to save configuration: ${error.message}\n\n`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteConfig = async (key) => {
    if (!window.confirm(`Are you sure you want to delete setting '${key}' from Redis cache?`)) return;

    appendTerminal(`$ deleting setting ${key}...\n`);
    try {
      const response = await axios.delete(`/api/founder/config/${key}`);
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.message}\n\n`);
        fetchConfigs();
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
      }
    } catch (error) {
      appendTerminal(`[ERROR] failed to delete: ${error.message}\n\n`);
    }
  };

  const handleEditConfig = (conf) => {
    setConfigKey(conf.key);
    setConfigValue(conf.value);
    setConfigDesc(conf.description || "");
    setEditingKey(conf.key);
  };

  const appendTerminal = (text) => {
    setTerminalOutput((prev) => prev + text);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Scroll terminal to bottom when output changes
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalOutput]);

  const handleRunCommand = async (commandName, displayName, args = null) => {
    if (runningCommand) return;
    setRunningCommand(commandName);
    
    let cmdString = `php artisan ${commandName}`;
    if (commandName === 'queue:work') {
      cmdString += ' --stop-when-empty';
    } else if (commandName === 'campaigns:dispatch' && args?.campaignId) {
      cmdString += ` ${args.campaignId}`;
    }
    
    appendTerminal(`$ ${cmdString}\n`);
    appendTerminal(`Executing: ${displayName}... Please wait.\n`);

    try {
      const response = await axios.post("/api/founder/run-command", { 
        command: commandName,
        arguments: args
      });
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.message}\n`);
        appendTerminal(`Output:\n${response.data.output}\n\n`);
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n`);
        appendTerminal(`Output:\n${response.data.output}\n\n`);
      }
      fetchData(); // Refresh stats
    } catch (error) {
      const errMsg = error.response?.data?.output || error.response?.data?.message || error.message;
      appendTerminal(`[ERROR] execution failed:\n${errMsg}\n\n`);
    } finally {
      setRunningCommand(null);
    }
  };

  const handleRetryJob = async (id) => {
    appendTerminal(`$ php artisan queue:retry ${id}\n`);
    try {
      const response = await axios.post("/api/founder/retry-failed-job", { id });
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.output}\n\n`);
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
      }
      fetchData();
    } catch (error) {
      appendTerminal(`[ERROR] Failed to retry: ${error.message}\n\n`);
    }
  };

  const handleDeleteJob = async (id) => {
    const label = id === "all" ? "all failed jobs" : `failed job ${id}`;
    if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;

    appendTerminal(`$ deleting ${label}...\n`);
    try {
      const response = await axios.post("/api/founder/delete-failed-job", { id });
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.output}\n\n`);
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
      }
      fetchData();
    } catch (error) {
      appendTerminal(`[ERROR] Failed to delete: ${error.message}\n\n`);
    }
  };

  const handleFlushQueue = async () => {
    if (!window.confirm("WARNING: This will clear all pending jobs from the queue! Are you sure?")) return;
    
    appendTerminal(`$ flushing active queue...\n`);
    try {
      const response = await axios.post("/api/founder/flush-queue");
      if (response.data.success) {
        appendTerminal(`[SUCCESS] ${response.data.output}\n\n`);
      } else {
        appendTerminal(`[FAILED] ${response.data.message}\n\n`);
      }
      fetchData();
    } catch (error) {
      appendTerminal(`[ERROR] Failed to flush: ${error.message}\n\n`);
    }
  };

  const clearConsole = () => {
    setTerminalOutput(
      "==========================================================\n" +
      "         KNOWYOURMAIL FOUNDER ADMINISTRATION CONSOLE       \n" +
      "==========================================================\n" +
      "Console cleared.\n\n"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-indigo-650 dark:text-indigo-400 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold tracking-wider">Loading Founder Dashboard...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recent = data?.recent || {};

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
        {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
              Platform Master Console
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight">
            Founder & QA Console
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time global metrics, billing statistics, and queue/jobs administration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold transition-all duration-200 shadow-md cursor-pointer hover:shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Platform Stats
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-bold transition-all duration-200 shadow-md cursor-pointer hover:shadow-lg"
          >
            <Eye className="h-4 w-4" />
            View User Dashboard
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Organizations */}
        <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 backdrop-blur-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 shadow-lg dark:hover:shadow-slate-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Organizations
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.platform?.organizations || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Registered workspace tenants</p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 backdrop-blur-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 shadow-lg dark:hover:shadow-slate-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Users
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-555 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.platform?.users || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Registered platform members</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 backdrop-blur-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 shadow-lg dark:hover:shadow-slate-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Revenue Volume
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{(metrics.billing?.total_revenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">{metrics.billing?.payments_count || 0} paid transactions</p>
          </CardContent>
        </Card>

        {/* Estimated MRR */}
        <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 backdrop-blur-md hover:border-slate-350 dark:hover:border-slate-600 transition-all duration-300 shadow-lg dark:hover:shadow-slate-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estimated MRR
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-555 dark:text-pink-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-pink-600 dark:text-pink-400">
              ₹{(metrics.billing?.mrr || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">From active billing subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Statistics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex flex-col justify-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Global Emails Sent</p>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            {(metrics.campaigns?.sent || 0).toLocaleString()}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex flex-col justify-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Delivery Rate</p>
          <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.campaigns?.delivery_rate || 0}%
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex flex-col justify-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Open Rate</p>
          <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {metrics.campaigns?.open_rate || 0}%
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex flex-col justify-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Click Rate (CTR)</p>
          <h4 className="text-2xl font-black text-purple-650 dark:text-purple-400">
            {metrics.campaigns?.click_rate || 0}%
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex flex-col justify-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Bounce Rate</p>
          <h4 className="text-2xl font-black text-red-600 dark:text-red-400">
            {metrics.campaigns?.bounce_rate || 0}%
          </h4>
        </div>
      </div>

      {/* Main Console Section */}
      <div className="grid gap-8 xl:grid-cols-3 mb-8">
        {/* Left Side: Commands Panel */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 backdrop-blur-md shadow-lg">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">QA Testing Controls</CardTitle>
              </div>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                Trigger platform jobs and scheduled workers programmatically without using CLI commands.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Campaign Dispatcher */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/80 transition-all duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Campaign Dispatcher</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Finds scheduled campaigns and queues emails.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Artisan
                  </Badge>
                </div>
                
                <div className="mt-2 mb-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    Specific Campaign ID (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter ID, e.g. 5"
                    value={specificCampaignId}
                    onChange={(e) => setSpecificCampaignId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                    disabled={!!runningCommand}
                  />
                </div>

                <Button
                  onClick={() => {
                    const args = specificCampaignId.trim() ? { campaignId: specificCampaignId } : null;
                    handleRunCommand("campaigns:dispatch", "Dispatch Campaigns", args);
                  }}
                  isLoading={runningCommand === "campaigns:dispatch"}
                  disabled={!!runningCommand}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold"
                  size="sm"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run campaigns:dispatch
                </Button>
              </div>

              {/* Queue Worker */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/80 transition-all duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sync Queue Worker</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Processes currently queued jobs (Redis/DB) synchronously.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Artisan
                  </Badge>
                </div>
                <Button
                  onClick={() => handleRunCommand("queue:work", "Run Queue Worker")}
                  isLoading={runningCommand === "queue:work"}
                  disabled={!!runningCommand}
                  className="w-full bg-purple-600 hover:bg-purple-500 font-bold"
                  size="sm"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run queue:work --once
                </Button>
              </div>

              {/* Subscription Renewals */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/80 transition-all duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Subscription Renewals</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Check and process due billing intervals.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Artisan
                  </Badge>
                </div>
                <Button
                  onClick={() => handleRunCommand("billing:process-renewals", "Process Due Renewals")}
                  isLoading={runningCommand === "billing:process-renewals"}
                  disabled={!!runningCommand}
                  className="w-full bg-pink-600 hover:bg-pink-500 font-bold"
                  size="sm"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run billing:process-renewals
                </Button>
              </div>

              {/* Sync Plans & Features */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/80 transition-all duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sync Payment Plans</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Sync payment configuration plans into database.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Artisan
                  </Badge>
                </div>
                <Button
                  onClick={() => handleRunCommand("billing:sync-plans", "Synchronize Plans Config")}
                  isLoading={runningCommand === "billing:sync-plans"}
                  disabled={!!runningCommand}
                  className="w-full bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-650 text-white font-bold"
                  size="sm"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run billing:sync-plans
                </Button>
              </div>

              {/* Danger Zone Controls */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-none mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-650 dark:text-red-400 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Danger Administration
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFlushQueue}
                    className="flex-1 bg-red-650 hover:bg-red-700 text-white py-2 text-xs font-bold transition duration-200 cursor-pointer text-center animate-in"
                  >
                    Flush Queue Size ({metrics.queue?.size || 0})
                  </button>
                  <button
                    onClick={() => handleDeleteJob("all")}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-red-650 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-red-400 py-2 text-xs font-bold transition duration-200 cursor-pointer text-center"
                  >
                    Delete All Failed
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Interactive Terminal Output */}
        <div className="xl:col-span-2">
          <Card className="bg-slate-950 border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden shadow-2xl relative border">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                </div>
                <span className="text-xs font-semibold text-slate-400 font-mono ml-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  founder-interactive-terminal
                </span>
              </div>
              <button
                onClick={clearConsole}
                className="text-[10px] text-slate-400 hover:text-slate-200 font-mono px-2 py-0.5 border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-all cursor-pointer"
              >
                Clear Screen
              </button>
            </div>
            
            <CardContent className="p-4 flex-1 overflow-y-auto font-mono text-xs text-indigo-300 bg-slate-950 min-h-[350px] max-h-[600px] leading-relaxed relative">
              <pre className="whitespace-pre-wrap select-all">{terminalOutput}</pre>
              <div ref={terminalEndRef} />
              <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle"></span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Logs Tables */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Recent Organizations */}
        <Card className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Recent Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Name</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Plan</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Status</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.organizations?.length > 0 ? (
                  recent.organizations.map((org) => (
                    <TableRow key={org.id} className="border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <TableCell className="font-semibold text-slate-900 dark:text-white py-3">{org.name}</TableCell>
                      <TableCell className="py-3">
                        <span className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                          {org.plan}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant={org.status === "active" ? "success" : "destructive"}
                          className="text-[9px] uppercase tracking-wider rounded"
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 py-3">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                      No organizations registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Payment Transactions */}
        <Card className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Recent Successful Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Workspace</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">User</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Amount</TableHead>
                  <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.payments?.length > 0 ? (
                  recent.payments.map((pm) => (
                    <TableRow key={pm.id} className="border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <TableCell className="font-semibold text-slate-900 dark:text-white py-3">{pm.org_name}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-slate-800 dark:text-slate-300 text-xs font-medium">{pm.user_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">{pm.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 py-3">
                        ₹{pm.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-550 dark:text-slate-500 py-3">
                        {pm.paid_at ? new Date(pm.paid_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                      No payment transactions recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Platform campaigns listing */}
      <Card className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 mb-8">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            Recent Campaigns Platform-Wide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Campaign Name</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Workspace</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Status</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Emails Sent</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.campaigns?.length > 0 ? (
                recent.campaigns.map((cp) => (
                  <TableRow key={cp.id} className="border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <TableCell className="font-semibold text-slate-900 dark:text-white py-3">{cp.name}</TableCell>
                    <TableCell className="text-slate-750 dark:text-slate-300 py-3">{cp.org_name || `Tenant ID ${cp.id}`}</TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant={
                          cp.status === "completed"
                            ? "success"
                            : cp.status === "running"
                            ? "default"
                            : "outline"
                        }
                        className="text-[9px] uppercase tracking-wider rounded"
                      >
                        {cp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-indigo-650 dark:text-indigo-400 py-3 font-semibold">
                      {(cp.sent_count || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-550 dark:text-slate-500 py-3">
                      {cp.created_at ? new Date(cp.created_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                    No campaigns created yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Failed Queue Jobs Inspector */}
      <Card className="bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 border-t-red-600 dark:border-t-red-900/60 border-t-2">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-650 dark:text-red-400 animate-pulse" />
              Failed Queue Jobs Inspector ({metrics.queue?.failed || 0})
            </CardTitle>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
              Review and retry failed background tasks.
            </p>
          </div>
          {recent.failed_jobs?.length > 0 && (
            <button
              onClick={() => handleRetryJob("all")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-bold shadow-md cursor-pointer transition duration-200"
            >
              Retry All Failed Jobs
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold w-12">ID</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Job Name</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Queue / Connection</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Exception details</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold">Failed At</TableHead>
                <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.failed_jobs?.length > 0 ? (
                recent.failed_jobs.map((job) => (
                  <TableRow key={job.id} className="border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800/10">
                    <TableCell className="font-mono text-slate-500 py-3">{job.id}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white py-3">
                      <span className="truncate max-w-[200px] block" title={job.name}>
                        {job.name.split("\\").pop()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-300 font-mono text-[10px]">{job.queue}</span>
                        <span className="text-[9px] text-slate-500 leading-none mt-0.5">{job.connection}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-red-650 dark:text-red-400 text-xs font-mono line-clamp-2 max-w-sm block" title={job.exception}>
                        {job.exception}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-550 dark:text-slate-500 py-3">
                      {job.failed_at ? new Date(job.failed_at).toLocaleTimeString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right py-3 pr-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="bg-indigo-650 hover:bg-indigo-600 text-white p-1.5 transition cursor-pointer"
                          title="Retry Job"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="bg-slate-105 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-red-650 dark:text-red-400 border border-slate-250 dark:border-slate-700 p-1.5 transition cursor-pointer"
                          title="Forget Job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <span>Clean slate! No failed queue jobs found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* QA Configuration Hub (Redis & Variable Controls) */}
      <div className="grid gap-8 lg:grid-cols-3 mb-8">
        
        {/* Step 1: Redis Instance Connection Card */}
        <Card className="lg:col-span-1 bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  1. Redis Connection Info
                </CardTitle>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                  Point to the Redis server on the kym-relay EC2.
                </p>
              </div>
              <Badge
                variant={redisStatus === "connected" ? "success" : "destructive"}
                className="text-[9px] uppercase tracking-wider rounded font-mono"
              >
                {redisStatus}
              </Badge>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {redisError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-sm break-all font-mono leading-normal">
                  <span className="font-bold uppercase tracking-wider block text-[10px] mb-1">Connection Error</span>
                  {redisError}
                </div>
              )}
              
              <form onSubmit={handleSaveRedisConnection} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    Redis Host / IP Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 54.210.12.190"
                    value={redisHost}
                    onChange={(e) => setRedisHost(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Input changing EC2 Public IP address</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="6379"
                      value={redisPort}
                      onChange={(e) => setRedisPort(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                      Redis Password (Auth)
                    </label>
                    <input
                      type="password"
                      placeholder="Optional"
                      value={redisPassword}
                      onChange={(e) => setRedisPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={savingRedis}
                  className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-bold"
                  size="sm"
                >
                  Verify & Save Connection
                </Button>
              </form>
            </CardContent>
          </div>
        </Card>
        
        {/* Step 2: Configuration Key-Value Editor Card */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-3">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              2. System Configurations (Redis Cache)
            </CardTitle>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
              Variables stored dynamically in remote Redis for ingestion by kym-relay-services.
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            {redisStatus !== "connected" ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mb-3 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-350">Connection Required</h4>
                <p className="text-xs text-slate-550 dark:text-slate-455 mt-1 max-w-sm">
                  Please configure and connect to the remote Redis instance in Step 1 first before editing caching configurations.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Configuration form */}
                <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-850 p-4 rounded shadow-sm">
                  {/* Predefined Quick-Fill Badges */}
                  <div className="mb-4">
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                      Quick-Fill Predefined QA Keys
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: "TRACKING_HOST", placeholder: "https://yourtunnel.trycloudflare.com/api" },
                        { key: "LARAVEL_INTERNAL_URL", placeholder: "http://<mail-tracker-server-ip>" },
                        { key: "DATABASE_URL", placeholder: "mysql://root:root@<database-server-ip>:3306/know_your_mail" },
                        { key: "REDIS_URL", placeholder: "redis://<redis-server-ip>:6379" },
                        { key: "MAILGUN_API_KEY", placeholder: "key-xxxxxxxxxxxxxx" },
                        { key: "MAILGUN_DOMAIN", placeholder: "knowyourmail.in" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            if (!editingKey) {
                              setConfigKey(item.key);
                              setConfigValue(item.placeholder);
                            }
                          }}
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded cursor-pointer transition"
                        >
                          {item.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                        Config Key
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. TRACKING_HOST"
                        value={configKey}
                        onChange={(e) => setConfigKey(e.target.value.toUpperCase())}
                        disabled={!!editingKey}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                        Config Value
                      </label>
                      <textarea
                        required
                        placeholder="Configuration value string"
                        value={configValue}
                        onChange={(e) => setConfigValue(e.target.value)}
                        rows={3}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                        Notes / Info
                      </label>
                      <input
                        type="text"
                        placeholder="What is this setting for?"
                        value={configDesc}
                        onChange={(e) => setConfigDesc(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="submit"
                        isLoading={savingConfig}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                        size="sm"
                      >
                        {editingKey ? "Update Cache" : "Save to Cache"}
                      </Button>
                      {editingKey && (
                        <Button
                          type="button"
                          onClick={() => {
                            setConfigKey("");
                            setConfigValue("");
                            setConfigDesc("");
                            setEditingKey(null);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-750 dark:text-slate-350"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Configurations Table List */}
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold w-1/2">Key</TableHead>
                        <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold w-1/2">Value</TableHead>
                        <TableHead className="text-xs text-slate-500 dark:text-slate-400 font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs && configs.length > 0 ? (
                        configs.map((conf) => (
                          <TableRow key={conf.key} className="border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800/10">
                            <TableCell className="py-2.5 font-mono font-bold text-slate-900 dark:text-indigo-350 text-[11px] truncate max-w-[120px]">
                              {conf.key}
                            </TableCell>
                            <TableCell className="py-2.5 font-mono text-slate-600 dark:text-slate-300 text-[11px] break-all max-w-[150px]">
                              {conf.value}
                            </TableCell>
                            <TableCell className="text-right py-2.5 pr-2">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditConfig(conf)}
                                  className="bg-slate-105 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-650 dark:text-indigo-400 border border-slate-205 dark:border-slate-700 p-1 rounded cursor-pointer"
                                  title="Edit"
                                >
                                  <Settings className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteConfig(conf.key)}
                                  className="bg-slate-105 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-red-650 dark:text-red-400 border border-slate-205 dark:border-slate-700 p-1 rounded cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-slate-500 py-10">
                            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-450">
                              <Database className="w-6 h-6" />
                              <span className="text-xs">No caching variables configured yet.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
