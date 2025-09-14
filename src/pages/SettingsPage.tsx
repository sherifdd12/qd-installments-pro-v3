import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_MESSAGE_TEMPLATE = "عزيزي [CustomerName]،\nنود تذكيركم بأن قسطكم بمبلغ [Amount] دينار كويتي مستحق الدفع.\nالرصيد المتبقي: [Balance] دينار كويتي.\nشكرًا لتعاونكم.";

const SettingsPage = () => {
    const { toast } = useToast();
    const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);

    useEffect(() => {
        const savedTemplate = localStorage.getItem('whatsappMessageTemplate');
        if (savedTemplate) {
            setMessageTemplate(savedTemplate);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('whatsappMessageTemplate', messageTemplate);
        toast({
            title: "تم الحفظ",
            description: "تم حفظ قالب رسالة WhatsApp بنجاح.",
        });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">الإعدادات</h1>
            <Card>
                <CardHeader>
                    <CardTitle>قالب رسالة تذكير WhatsApp</CardTitle>
                    <CardDescription>
                        قم بتخصيص الرسالة التي سيتم إرسالها كتذكير بالدفع. يمكنك استخدام العناصر النائبة التالية:
                        [CustomerName], [Amount], [Balance].
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="message">القالب</Label>
                        <Textarea
                            id="message"
                            value={messageTemplate}
                            onChange={(e) => setMessageTemplate(e.target.value)}
                            rows={6}
                        />
                    </div>
                    <Button onClick={handleSave}>حفظ القالب</Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsPage;
