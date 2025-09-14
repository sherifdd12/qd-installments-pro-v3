import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const RegisterForm = ({ onSuccess, onSwitchToLogin }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "خطأ في كلمة المرور",
        description: "كلمات المرور غير متطابقة",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "كلمة المرور ضعيفة",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: formData.fullName,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here as the user account was created successfully
        }

        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "تم إنشاء حسابك بنجاح. يرجى تسجيل الدخول.",
        });

        // Reset form
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
        });

        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: "فشل في إنشاء الحساب",
        description: error.message || "حدث خطأ غير متوقع",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-right">
        <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
        <CardDescription>
          أدخل بياناتك لإنشاء حساب جديد في النظام.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 text-right">
            <Label htmlFor="fullName">الاسم الكامل</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="text-right"
              placeholder="أدخل اسمك الكامل"
            />
          </div>
          <div className="grid gap-2 text-right">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="text-right"
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>
          <div className="grid gap-2 text-right">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="text-right"
              placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
            />
          </div>
          <div className="grid gap-2 text-right">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className="text-right"
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </Button>
          {onSwitchToLogin && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onSwitchToLogin}
            >
              لديك حساب بالفعل؟ تسجيل الدخول
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

export default RegisterForm;
