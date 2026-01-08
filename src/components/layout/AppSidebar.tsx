import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  Package,
  Factory,
  ShoppingCart,
  Wallet,
  Users,
  Truck,
  Settings,
  LogOut,
  FileText,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

const navigation = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Masters',
    icon: Building2,
    children: [
      { title: 'Raw Materials', href: '/masters/raw-materials' },
      { title: 'Finished Goods', href: '/masters/finished-goods' },
      { title: 'Suppliers', href: '/masters/suppliers' },
      { title: 'Customers', href: '/masters/customers' },
      { title: 'Employees', href: '/masters/employees' },
      { title: 'Vehicles', href: '/masters/vehicles' },
    ],
  },
  {
    title: 'Production',
    icon: Factory,
    children: [
      { title: 'Production Entry', href: '/production/entry' },
      { title: 'Cutting & Sealing', href: '/production/cutting-sealing' },
      { title: 'Packing', href: '/production/packing' },
      { title: 'Material Consumption', href: '/production/consumption' },
      { title: 'Wastage & Damages', href: '/production/wastage' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    children: [
      { title: 'Purchase Orders', href: '/inventory/purchase-orders' },
      { title: 'Purchases', href: '/inventory/purchases' },
      { title: 'Purchase Returns', href: '/inventory/purchase-returns' },
      { title: 'Stock Report', href: '/inventory/stock' },
    ],
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    children: [
      { title: 'Customer Orders', href: '/sales/orders' },
      { title: 'Invoices', href: '/sales/invoices' },
      { title: 'Deliveries', href: '/sales/deliveries' },
      { title: 'Sales Returns', href: '/sales/returns' },
    ],
  },
  {
    title: 'Finance',
    icon: Wallet,
    children: [
      { title: 'Collections', href: '/finance/collections' },
      { title: 'Payments', href: '/finance/payments' },
      { title: 'Petty Cash', href: '/finance/petty-cash' },
    ],
  },
  {
    title: 'HR',
    icon: Users,
    children: [
      { title: 'Attendance', href: '/hr/attendance' },
      { title: 'Marketing Visits', href: '/hr/marketing-visits' },
    ],
  },
  {
    title: 'Reports',
    icon: FileText,
    children: [
      { title: 'Sales Report', href: '/reports/sales' },
      { title: 'Purchase Report', href: '/reports/purchase' },
      { title: 'Production Report', href: '/reports/production' },
      { title: 'Stock Report', href: '/reports/stock' },
      { title: 'Attendance Report', href: '/reports/attendance' },
      { title: 'Collection Report', href: '/reports/collection' },
      { title: 'Scorecard', href: '/reports/scorecard' },
    ],
  },
  {
    title: 'KEIL Operations',
    icon: Truck,
    children: [
      { title: 'Overview', href: '/keil' },
      { title: 'Route Management', href: '/keil/routes' },
      { title: 'HCE Details', href: '/keil/hce' },
      { title: 'Daily Collection', href: '/keil/collection' },
    ],
  },
  {
    title: 'SMS Contracts',
    icon: FileText,
    href: '/sms',
    viewOnly: true,
  },
];

const adminNavigation = [
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'System Settings', href: '/settings/system' },
      { title: 'User Management', href: '/settings/users' },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { role, signOut, user } = useAuth();
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>(['Masters', 'Production', 'Sales', 'Finance']);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const hasActiveChild = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname === child.href);

  const renderNavItem = (item: typeof navigation[0]) => {
    if (item.children) {
      return (
        <Collapsible
          key={item.title}
          open={openGroups.includes(item.title)}
          onOpenChange={() => toggleGroup(item.title)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className={cn(
                  'w-full justify-between',
                  hasActiveChild(item.children) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    openGroups.includes(item.title) && 'rotate-180'
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 pt-1 space-y-1">
              {item.children.map((child) => (
                <SidebarMenuButton
                  key={child.href}
                  asChild
                  className={cn(
                    'w-full',
                    isActive(child.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <Link to={child.href}>{child.title}</Link>
                </SidebarMenuButton>
              ))}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          className={cn(
            'w-full',
            isActive(item.href!) && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
        >
          <Link to={item.href!} className="flex items-center gap-2">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            {item.viewOnly && (
              <Badge variant="outline" className="ml-auto text-xs border-sidebar-border text-sidebar-foreground/60">
                <Lock className="h-3 w-3 mr-1" />
                View Only
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
            <Building2 className="h-6 w-6 text-sidebar-accent-foreground" />
          </div>
          <div className={cn('transition-all', state === 'collapsed' && 'hidden')}>
            <h1 className="text-lg font-bold text-sidebar-foreground">Maxtron ERP</h1>
            <p className="text-xs text-sidebar-foreground/60">Manufacturing Suite</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === 'super_admin' || role === 'manager') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={cn('flex items-center gap-3', state === 'collapsed' && 'justify-center')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className={cn('flex-1 overflow-hidden', state === 'collapsed' && 'hidden')}>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role?.replace('_', ' ')}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn('text-sidebar-foreground hover:bg-sidebar-accent', state === 'collapsed' && 'hidden')}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
