import { useState, useEffect } from "react";
import {
  LogIn,
  UserPlus,
  Clock,
  Sparkles,
  Check,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAppDispatch } from "@/app/hooks";
import { setSession, LAST_EMAIL_KEY } from "@/features/auth/authSlice";
import { useLoginMutation, useSignupMutation } from "@/services/api";
import { UserRole } from "@/types/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function AuthCard() {
  const dispatch = useAppDispatch();
  const [loginMut, { isLoading: isLoggingIn }] = useLoginMutation();
  const [signupMut, { isLoading: isSigningUp }] = useSignupMutation();

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");

  // Load remembered last-used email
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = window.localStorage.getItem(LAST_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const handleDemoFill = (demoEmail: string, demoRole: UserRole) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setRole(demoRole);
    toast.info(`Filled credentials for ${demoRole}`, {
      description: `Email: ${demoEmail}`,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }

    try {
      const res = await loginMut({ email, password }).unwrap();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_EMAIL_KEY, email);
      }
      dispatch(setSession(res));
      toast.success(`Welcome back, ${res.user.name}!`);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || "Invalid email or password");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill all required fields.");
      return;
    }

    try {
      const res = await signupMut({ name, email, password, role }).unwrap();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_EMAIL_KEY, email);
      }
      dispatch(setSession(res));
      toast.success(`Account created! Welcome, ${res.user.name}.`);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || "Registration failed");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 ring-4 ring-indigo-50 dark:ring-indigo-950/40">
          <Clock className="h-7 w-7 stroke-[2.2]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          PunchPoint
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
          Presence Keeper &bull; Geoverified Check-In &bull; Shift Tracking
        </p>
      </div>

      {/* Auth Card */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <div className="p-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <TabsList className="grid grid-cols-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 p-1">
              <TabsTrigger value="login" className="rounded-xl text-xs font-semibold py-2">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl text-xs font-semibold py-2">
                Register
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Quick Demo Credentials Bar */}
          <div className="px-6 pt-4 pb-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
              <span>Quick Demo Fill:</span>
              <span>Password: Password123!</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill("sofia@punchpoint.demo", "employee")}
                className="text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill("marcus@punchpoint.demo", "manager")}
                className="text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill("avery@punchpoint.demo", "admin")}
                className="text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Sign In Form */}
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-email"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-6 px-6">
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {isLoggingIn ? "Signing In..." : "Sign In to PunchPoint"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-3.5 pt-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-name"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-name"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-email"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-password"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password (min 6 characters)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Demo Assignment Role
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["employee", "manager", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`text-xs py-2 rounded-xl capitalize font-medium border transition-all ${
                          role === r
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-6 px-6">
                <Button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isSigningUp ? "Creating Account..." : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
