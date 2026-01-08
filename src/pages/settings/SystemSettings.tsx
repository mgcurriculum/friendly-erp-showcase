import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Mail, Phone, MapPin, FileText, Palette, Upload, Save } from 'lucide-react';

interface SettingsFormData {
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
  email: string;
  gst_number: string;
  license_number: string;
}

export default function SystemSettings() {
  const { role } = useAuth();
  const { data: settings, isLoading } = useSystemSettings();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsFormData>({
    defaultValues: {
      company_name: '',
      logo_url: '',
      primary_color: '#3b82f6',
      secondary_color: '#6366f1',
      address: '',
      phone: '',
      email: '',
      gst_number: '',
      license_number: '',
    },
  });

  const primaryColor = watch('primary_color');
  const secondaryColor = watch('secondary_color');

  useEffect(() => {
    if (settings) {
      reset({
        company_name: settings.company_name || '',
        logo_url: settings.logo_url || '',
        primary_color: settings.primary_color || '#3b82f6',
        secondary_color: settings.secondary_color || '#6366f1',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        gst_number: settings.gst_number || '',
        license_number: settings.license_number || '',
      });
      setLogoPreview(settings.logo_url);
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      if (!settings?.id) {
        // Create new settings if none exist
        const { error } = await supabase
          .from('system_settings')
          .insert([data]);
        if (error) throw error;
      } else {
        // Update existing settings
        const { error } = await supabase
          .from('system_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, convert to base64 data URL for preview
    // In production, you'd upload to storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setValue('logo_url', result);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  const canEdit = role === 'super_admin';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Manage your company information and branding</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Basic details about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    {...register('company_name')}
                    disabled={!canEdit}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      {...register('email')}
                      disabled={!canEdit}
                      placeholder="company@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-10"
                      {...register('phone')}
                      disabled={!canEdit}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      className="pl-10 min-h-[80px]"
                      {...register('address')}
                      disabled={!canEdit}
                      placeholder="Enter company address"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal Information
              </CardTitle>
              <CardDescription>Tax and license details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    {...register('gst_number')}
                    disabled={!canEdit}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    {...register('license_number')}
                    disabled={!canEdit}
                    placeholder="Enter license number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>Customize your company's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {canEdit && (
                    <div className="space-y-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </div>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 200x200px, PNG or JPG
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary_color"
                      type="color"
                      className="w-16 h-10 p-1 cursor-pointer"
                      {...register('primary_color')}
                      disabled={!canEdit}
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setValue('primary_color', e.target.value)}
                      disabled={!canEdit}
                      className="flex-1"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="secondary_color"
                      type="color"
                      className="w-16 h-10 p-1 cursor-pointer"
                      {...register('secondary_color')}
                      disabled={!canEdit}
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setValue('secondary_color', e.target.value)}
                      disabled={!canEdit}
                      className="flex-1"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="space-y-2">
                <Label>Color Preview</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-24 rounded-md shadow-sm flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </div>
                  <div
                    className="h-12 w-24 rounded-md shadow-sm flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="min-w-[120px]">
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          )}

          {!canEdit && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-amber-800 text-sm">
                  Only Super Admins can modify system settings. Contact your administrator for changes.
                </p>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
