# 🎨 Mobile UI/UX Improvement Plan

> **Vấn đề hiện tại:** Layout chưa hiện đại, navigation chưa tách biệt rõ ràng
> 
> **Mục tiêu:** Tạo giao diện hiện đại, clean, với hierarchy rõ ràng

---

## 🔴 Vấn đề hiện tại

### 1. **Tab Bar Overload**
- ❌ 8 tabs → quá đông, icon quá nhỏ
- ❌ Không có prioritization
- ❌ Khó tap trên màn hình nhỏ
- ❌ Thiếu visual hierarchy

### 2. **Thiếu Header/App Bar**
- ❌ Không có header cố định
- ❌ Không có title/context
- ❌ Không có notification bell
- ❌ Không có user avatar

### 3. **Content Layout Issues**
- ❌ Content chạm edge màn hình
- ❌ Thiếu padding/spacing consistent
- ❌ Cards không có elevation rõ ràng
- ❌ Thiếu visual separation

### 4. **Navigation Structure**
- ❌ Flat structure, tất cả ở bottom tabs
- ❌ Không có drawer/menu cho secondary features
- ❌ Không có breadcrumbs/back navigation rõ ràng

---

## ✅ Giải pháp đề xuất

### 🏗️ Architecture: Modern 3-Layer Navigation

```
┌─────────────────────────────────────┐
│   App Header (Fixed)                │ ← Layer 1: Context & Actions
│   • Title + Back                    │
│   • Notifications + Avatar          │
├─────────────────────────────────────┤
│                                     │
│   Content Area (Scrollable)         │ ← Layer 2: Main Content
│   • Proper padding                  │
│   • Card-based layout               │
│   • Visual hierarchy                │
│                                     │
├─────────────────────────────────────┤
│   Bottom Navigation (4-5 items)     │ ← Layer 3: Primary Navigation
│   • Main features only              │
│   • Clear icons + labels            │
└─────────────────────────────────────┘
```

---

## 🎯 Cải tiến cụ thể

### 1. **Simplify Bottom Navigation** (4-5 items)

**Hiện tại (8 tabs):**
```
[Tổng quan] [Lịch hẹn] [Chat] [Bác sĩ] [Hồ sơ] [Đơn thuốc] [Thanh toán] [Cài đặt]
   ↓ quá đông, khó chọn
```

**Đề xuất (4-5 tabs PRIMARY):**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Trang  │  Lịch   │  Chat   │  Khám   │   Tôi   │
│  Chủ    │  Hẹn    │         │  Sức    │         │
│    🏠    │   📅    │   💬    │  Khỏe   │   👤    │
│         │         │         │   🏥    │         │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Tab mapping:**
- **🏠 Home (Trang chủ):** Dashboard + Quick actions
- **📅 Lịch hẹn:** Appointments + Follow-ups
- **💬 Chat:** Messages
- **🏥 Sức khỏe:** Medical Records + Prescriptions + Doctors
- **👤 Tôi:** Profile + Settings + Wallet + Payments + Vouchers

### 2. **Add Modern App Header**

```tsx
┌────────────────────────────────────────────┐
│  ← Back    Trang chủ        🔔(3)  👤      │ ← Sticky header
│                                            │
│  • Dynamic title per screen                │
│  • Back button (conditional)               │
│  • Notification bell with badge            │
│  • User avatar (tap → profile)             │
└────────────────────────────────────────────┘
```

**Features:**
- Gradient background (subtle)
- Shadow/elevation
- Safe area handling
- Smooth transitions

### 3. **Implement Drawer Navigation**

**Swipe từ trái hoặc tap avatar:**
```
┌─────────────────────────┐
│  👤 Nguyễn Văn A        │
│  patient@email.com      │
├─────────────────────────┤
│  🏠  Trang chủ           │
│  💰  Ví của tôi         │
│  🎁  Voucher            │
│  💳  Thanh toán         │
│  ⚕️  Bác sĩ             │
│  📋  Hồ sơ bệnh án      │
│  💊  Đơn thuốc          │
│  🔔  Thông báo          │
├─────────────────────────┤
│  ⚙️  Cài đặt            │
│  ❓  Trợ giúp           │
│  🚪  Đăng xuất          │
└─────────────────────────┘
```

### 4. **Card-based Layout with Proper Spacing**

**Before:**
```tsx
<View>  {/* Full width, no padding */}
  <Text>Title</Text>
  <Text>Content</Text>
</View>
```

**After:**
```tsx
<View className="px-4 pt-4"> {/* Consistent padding */}
  <Card className="mb-4"> {/* Card with elevation */}
    <Text>Title</Text>
    <Text>Content</Text>
  </Card>
</View>
```

**Design tokens:**
- Container padding: `16px` (px-4)
- Card margin: `16px` (mb-4)
- Card padding: `20px` (p-5)
- Border radius: `16px` (rounded-2xl)
- Shadow: elevation 2-4

### 5. **Visual Hierarchy with Typography**

```tsx
// Heading hierarchy
<Text className="text-2xl font-bold text-gray-900">    {/* H1 */}
<Text className="text-xl font-semibold text-gray-800"> {/* H2 */}
<Text className="text-lg font-medium text-gray-700">   {/* H3 */}
<Text className="text-base text-gray-600">             {/* Body */}
<Text className="text-sm text-gray-500">               {/* Caption */}

// Spacing scale
gap-1  = 4px   (tight)
gap-2  = 8px   (compact)
gap-3  = 12px  (comfortable)
gap-4  = 16px  (standard)
gap-6  = 24px  (loose)
gap-8  = 32px  (spacious)
```

---

## 📐 Layout Templates

### Template 1: Dashboard Home
```tsx
<SafeAreaView>
  <AppHeader 
    title="Trang chủ"
    showNotification 
    showAvatar 
  />
  
  <ScrollView className="flex-1 bg-gray-50">
    <View className="px-4 pt-4 pb-20"> {/* Extra pb for tab bar */}
      
      {/* Hero Section */}
      <Card className="mb-6 bg-gradient-to-br from-blue-600 to-indigo-600">
        <WelcomeCard user={user} />
      </Card>
      
      {/* KPI Grid */}
      <View className="grid grid-cols-2 gap-4 mb-6">
        <KPICard icon="📅" title="Lịch hẹn" value="2" />
        <KPICard icon="💊" title="Đơn thuốc" value="3" />
      </View>
      
      {/* Quick Actions */}
      <SectionHeader title="Thao tác nhanh" />
      <QuickActions />
      
      {/* Recent Activities */}
      <SectionHeader title="Hoạt động gần đây" />
      <ActivityList items={activities} />
      
    </View>
  </ScrollView>
</SafeAreaView>
```

### Template 2: List Screen
```tsx
<SafeAreaView>
  <AppHeader 
    title="Lịch hẹn"
    showBack={false}
    showSearch
  />
  
  <View className="flex-1 bg-gray-50">
    {/* Filters */}
    <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-200">
      <FilterTabs tabs={['Tất cả', 'Sắp tới', 'Đã hoàn thành']} />
    </View>
    
    {/* List with pull-to-refresh */}
    <FlatList
      data={appointments}
      renderItem={({ item }) => <AppointmentCard item={item} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListEmptyComponent={<EmptyState />}
    />
  </View>
  
  {/* Floating Action Button */}
  <FAB icon="+" onPress={handleCreate} />
</SafeAreaView>
```

### Template 3: Detail Screen
```tsx
<SafeAreaView>
  <AppHeader 
    title="Chi tiết lịch hẹn"
    showBack
  />
  
  <ScrollView className="flex-1 bg-gray-50">
    <View className="px-4 pt-4 pb-20">
      
      {/* Status Banner */}
      <StatusBanner status={appointment.status} />
      
      {/* Main Info Card */}
      <Card className="mb-4">
        <DetailSection data={appointment} />
      </Card>
      
      {/* Action Buttons */}
      <View className="flex-row gap-3 mb-4">
        <Button variant="primary">Xác nhận</Button>
        <Button variant="secondary">Đổi lịch</Button>
      </View>
      
      {/* Additional Info */}
      <Card>
        <InfoGrid data={additionalInfo} />
      </Card>
      
    </View>
  </ScrollView>
</SafeAreaView>
```

---

## 🎨 Component Library

### Core Components cần tạo:

```
components/
  layout/
    AppHeader.tsx              ✨ NEW - Modern header
    DrawerMenu.tsx             ✨ NEW - Slide-out menu
    SafeContainer.tsx          ✨ NEW - Container with safe area
    
  ui/
    Card.tsx                   ✨ NEW - Elevated card
    Button.tsx                 ✨ Enhance - Multiple variants
    Badge.tsx                  ✨ NEW - For notifications
    Avatar.tsx                 ✨ NEW - User avatar
    FAB.tsx                    ✨ NEW - Floating action button
    EmptyState.tsx             ✨ NEW - Empty list placeholder
    SectionHeader.tsx          ✨ NEW - Section divider
    StatusBanner.tsx           ✨ NEW - Status indicator
    
  navigation/
    TabBar.tsx                 ♻️ Refactor - Simpler, 4-5 items
    FilterTabs.tsx             ✨ NEW - Horizontal filter tabs
    Breadcrumb.tsx             ✨ NEW - Navigation breadcrumb
```

---

## 📱 Screen Refactoring Priority

### Phase 1: Core Components (Week 1)
- [ ] Create AppHeader component
- [ ] Refactor TabBar (reduce to 4-5 items)
- [ ] Create Card component
- [ ] Create Button variants
- [ ] Create DrawerMenu

### Phase 2: Layout Templates (Week 1-2)
- [ ] Refactor Home screen (Dashboard template)
- [ ] Refactor Appointments (List template)
- [ ] Refactor Settings (Menu template)
- [ ] Create SafeContainer wrapper

### Phase 3: Feature Screens (Week 2-3)
- [ ] Refactor all existing screens with new layout
- [ ] Add proper spacing/padding
- [ ] Implement visual hierarchy
- [ ] Add loading states
- [ ] Add empty states

---

## 🎨 Design System

### Colors
```typescript
// Primary palette
primary: {
  50: '#eff6ff',
  100: '#dbeafe',
  500: '#3b82f6',  // Main brand color
  600: '#2563eb',
  700: '#1d4ed8',
}

// Neutral palette
gray: {
  50: '#f9fafb',   // Background
  100: '#f3f4f6',  // Card background
  200: '#e5e7eb',  // Border
  500: '#6b7280',  // Secondary text
  900: '#111827',  // Primary text
}

// Semantic colors
success: '#10b981',
warning: '#f59e0b',
error: '#ef4444',
info: '#3b82f6',
```

### Spacing Scale
```typescript
spacing: {
  xs: 4,   // gap-1
  sm: 8,   // gap-2
  md: 12,  // gap-3
  lg: 16,  // gap-4
  xl: 24,  // gap-6
  '2xl': 32, // gap-8
}
```

### Typography
```typescript
fontSize: {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
}

fontWeight: {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}
```

### Shadows/Elevation
```typescript
shadow: {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
}
```

---

## 🎯 Before & After Examples

### Example 1: Dashboard

**Before:**
```tsx
// No header, cluttered, no spacing
<LinearGradient colors={['#eff6ff', '#e0f2fe', '#fff']}>
  <SafeAreaView>
    <ScrollView>
      <View>  {/* No padding */}
        <View>  {/* Card without elevation */}
          <Text>Welcome</Text>
        </View>
        <View>
          {KPI_CARDS.map(...)}  {/* No consistent spacing */}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
</LinearGradient>
```

**After:**
```tsx
<SafeAreaView className="flex-1 bg-gray-50">
  {/* Modern header */}
  <AppHeader 
    title="Trang chủ"
    showNotification
    showAvatar
    notificationCount={3}
  />
  
  {/* Scrollable content with proper padding */}
  <ScrollView className="flex-1">
    <View className="px-4 pt-4 pb-24">
      
      {/* Hero card with gradient */}
      <Card gradient className="mb-6">
        <WelcomeCard user={user} />
      </Card>
      
      {/* KPI grid with consistent spacing */}
      <View className="grid grid-cols-2 gap-4 mb-6">
        <KPICard {...kpi1} />
        <KPICard {...kpi2} />
      </View>
      
      {/* Section with header */}
      <SectionHeader title="Hoạt động gần đây" />
      <View className="space-y-3">
        {activities.map(activity => (
          <ActivityCard key={activity.id} {...activity} />
        ))}
      </View>
      
    </View>
  </ScrollView>
</SafeAreaView>
```

### Example 2: Tab Bar

**Before:**
```tsx
// 8 tabs, cramped
<Tabs>
  <Tab name="index" title="Tổng quan" />
  <Tab name="appointments" title="Lịch hẹn" />
  <Tab name="chat" title="Chat" />
  <Tab name="doctors" title="Bác sĩ" />
  <Tab name="records" title="Hồ sơ" />
  <Tab name="prescriptions" title="Đơn thuốc" />
  <Tab name="payments" title="Thanh toán" />
  <Tab name="settings" title="Cài đặt" />
</Tabs>
```

**After:**
```tsx
// 5 tabs, spacious
<Tabs>
  <Tab name="home" title="Trang chủ" icon="house.fill" />
  <Tab name="appointments" title="Lịch hẹn" icon="calendar" />
  <Tab name="chat" title="Chat" icon="message.fill" />
  <Tab name="health" title="Sức khỏe" icon="heart.fill" />
  <Tab name="profile" title="Tôi" icon="person.fill" />
</Tabs>

// Secondary features → Drawer menu
<DrawerMenu>
  <MenuItem icon="💰" title="Ví của tôi" route="/wallet" />
  <MenuItem icon="🎁" title="Voucher" route="/vouchers" />
  <MenuItem icon="💳" title="Thanh toán" route="/payments" />
  <MenuItem icon="⚕️" title="Bác sĩ" route="/doctors" />
  <MenuItem icon="📋" title="Hồ sơ" route="/records" />
  <MenuItem icon="💊" title="Đơn thuốc" route="/prescriptions" />
</DrawerMenu>
```

---

## 🚀 Implementation Steps

### Step 1: Create Design System (Day 1-2) ✅ COMPLETED
```bash
# Create design tokens
mobile/constants/
  colors.ts       # ✅ Color palette
  spacing.ts      # ✅ Spacing scale
  typography.ts   # ✅ Font sizes, weights
  shadows.ts      # ✅ Elevation styles
```

### Step 2: Build Core Components (Day 3-5) 🔄 IN PROGRESS
```bash
mobile/components/layout/
  AppHeader.tsx         # ✅ Done
  DrawerMenu.tsx        # ⏳ TODO
  SafeContainer.tsx     # ✅ Done

mobile/components/ui/
  Card.tsx              # ✅ Done
  Button.tsx            # ✅ Done
  Badge.tsx             # ✅ Done
  SectionHeader.tsx     # ✅ Done
  EmptyState.tsx        # ✅ Done
  Avatar.tsx            # ⏳ TODO
```

### Step 3: Refactor Navigation (Day 6-7)
```bash
# Simplify tab bar
app/(tabs)/_layout.tsx  # Reduce to 5 tabs

# Add drawer navigation
app/_layout.tsx         # Add drawer

# Update routes
app/(tabs)/home.tsx     # Rename from index
app/(tabs)/health.tsx   # New grouped screen
app/(tabs)/profile.tsx  # New profile hub
```

### Step 4: Refactor Screens (Week 2-3)
```bash
# Apply new layout to all screens
app/(tabs)/home.tsx
app/(tabs)/appointments.tsx
app/(tabs)/chat.tsx
app/(tabs)/health.tsx
app/(tabs)/profile.tsx

# Create sub-screens
app/wallet/index.tsx
app/vouchers/index.tsx
app/payments/index.tsx
app/notifications/index.tsx
```

---

## ✅ Success Criteria

### Visual Quality:
- [ ] Consistent spacing throughout app
- [ ] Clear visual hierarchy on all screens
- [ ] Proper elevation/shadows on cards
- [ ] Modern, clean aesthetic
- [ ] Smooth animations/transitions

### Navigation:
- [ ] Easy to reach primary features (bottom tabs)
- [ ] Secondary features accessible (drawer)
- [ ] Clear context (header shows where you are)
- [ ] Easy to go back (back button/gesture)

### Accessibility:
- [ ] Tap targets ≥ 44x44 points
- [ ] Sufficient color contrast
- [ ] Clear labels
- [ ] Readable font sizes

### Performance:
- [ ] Smooth 60fps animations
- [ ] Fast screen transitions
- [ ] Responsive to touch
- [ ] No jank when scrolling

---

## 📚 References

### Design Inspiration:
- **Apple Health App** - Clean card layout, clear hierarchy
- **Revolut** - Modern banking UI, smooth animations
- **Headspace** - Calm color palette, rounded corners
- **Airbnb** - Card-based design, consistent spacing

### Resources:
- Material Design 3: https://m3.material.io/
- iOS Human Interface Guidelines: https://developer.apple.com/design/
- NativeWind docs: https://www.nativewind.dev/

---

**Next Steps:** 
1. Review design with team
2. Create design tokens
3. Build core components
4. Refactor one screen as proof of concept
5. Apply to all screens

