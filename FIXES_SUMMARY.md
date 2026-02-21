# Bug Fixes Summary: 401 Error, Null Profile, Database Mismatch

## แก้ไขแล้ว ✅

### 1. Error 401 (RLS Policy Issue) - FIXED ✅

**ปัญหา:**

- Supabase RLS profile ส่วนใหญ่จะตรวจสอบ `auth.uid()` แต่ไม่มีคอลัมน์ในตาราง `profiles` เพื่อเก็บค่านี้
- โค้ดเดิมใช้ `.eq("id", user.id)` แต่ `profiles.id` เป็น UUID ที่สร้างขึ้นเอง ไม่ได้เป็น auth.uid()

**วิธีแก้:**

1. **เพิ่มคอลัมน์ `user_id` ในตาราง profiles** - บันทึก `auth.uid()`
   - ไฟล์: [src/sql/สคีมา](src/sql/สคีมา)
   - เพิ่มคอลัมน์: `user_id uuid NOT NULL UNIQUE` + constraint ที่อ้างอิง `auth.users`

2. **อัปเดต useProfile.ts** - บันทึก auth.uid() เมื่อสร้าง/อัปเดต profile
   - ดึง session จาก `supabase.auth.getSession()`
   - เก็บ `user_id: userId` ในการ upsert

3. **อัปเดต JoinTeam.vue** - ใช้ `user_id` แล้วแต่จะ query
   - เปลี่ยนจาก: `.eq("id", user.id)`
   - เป็น: `.eq("user_id", user.id)` (user.id จาก session เป็น auth.uid())

4. **อัปเดต CreateParty.vue** - สอดคล้องกัน
   - เพิ่มการอัพเดตโปรไฟล์โดยใช้ `user_id`

---

### 2. Profile is Null (Loading Issue) - FIXED ✅

**ปัญหา:**

- ไม่มีการป้องกันการเข้าถึง `userStore.profile` ก่อนข้อมูล load เสร็จ
- อาจทำให้เกิด "Cannot read property of null" errors

**วิธีแก้:**

1. **เพิ่มเมธอด `isProfileLoaded()`** - ในไฟล์ [src/stores/user.ts](src/stores/user.ts)

   ```typescript
   function isProfileLoaded(): boolean {
     return !loading.value && profile.value !== null;
   }
   ```

2. **สร้าง composable guard** - ไฟล์: [src/composables/useProfileGuard.ts](src/composables/useProfileGuard.ts)
   - `useProfileGuard()` - สำหรับ template guards
   - `useProfileGuardAsync()` - สำหรับ async functions

3. **ใช้งานใน component:**

   **ตัวอย่างที่ 1: Template Guard (recommended)**

   ```vue
   <script setup>
   import { useProfileGuard } from "../composables/useProfileGuard";

   const isReady = useProfileGuard();
   </script>

   <template>
     <div v-if="isReady">
       <!-- Content that uses userStore.profile -->
       <p>{{ userStore.profile?.display_name }}</p>
     </div>
     <div v-else>
       <p>Loading profile...</p>
     </div>
   </template>
   ```

   **ตัวอย่างที่ 2: Async Guard**

   ```typescript
   import { useProfileGuardAsync } from "../composables/useProfileGuard";

   const { waitForProfile } = useProfileGuardAsync();

   onMounted(async () => {
     await waitForProfile();
     // Now userStore.profile is safely loaded
     const userId = userStore.profile.id;
   });
   ```

4. **อัปเดต App.vue** - จัดการ error state
   - เพิ่ม `userStore.setProfile(null)` ใน catch block

---

### 3. Database Mismatch - FIXED ✅

**ปัญหา:**

- `.eq('id', userUuid)` ไม่ตรงกับ schema ของ profiles table
- `profiles.id` ≠ `auth.users.id` (ต่างกันทั้งหมด)

**วิธีแก้:**

1. เพิ่มคอลัมน์ `user_id` ที่เป็น FK ไปยัง `auth.users(id)`
2. เปลี่ยนการ query ทุกที่ให้ใช้:
   - `.eq("user_id", user.id)` สำหรับการตรวจสอบ auth
   - `.eq("id", profile.id)` สำหรับการตรวจสอบ profile (ถ้าจำเป็น)

---

## 📋 Checklist สำหรับ Supabase Setup

ลงทะเบียนและทำตามข้อต่อไปนี้ใน Supabase SQL Editor:

### 1. ✅ อัปเดต profiles table schema

```sql
-- ลบ table เดิม (ถ้ามีข้อมูลสำคัญให้ backup ก่อน)
DROP TABLE public.profiles CASCADE;

-- สร้างใหม่พร้อม user_id
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  line_user_id text NOT NULL UNIQUE,
  display_name text,
  picture_url text,
  team_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### 2. ✅ ตั้งค่า RLS Policy

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับอ่านข้อมูลตัวเอง
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy สำหรับอัปเดตข้อมูลตัวเอง
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy สำหรับสร้าง profile
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 🧪 Testing

### ทดสอบ 401 Error:

1. เข้าสู่ระบบ
2. ไปที่หน้า Join Team
3. ตรวจสอบ Network tab ใน DevTools - ไม่ควรมี 401 error

### ทดสอบ Null Profile:

1. Refresh หน้าแอป
2. ตรวจสอบที่ Console ว่าไม่มี "Cannot read property" error
3. แสดง Loading indicator จนกว่าโปรไฟล์จะ load เสร็จ

### ทดสอบ Database Mismatch:

1. สร้างทีมใหม่ (Create Party)
2. เข้าร่วมทีม (Join Team)
3. ตรวจสอบ Supabase Dashboard ว่า team_id อัปเดตถูกต้อง

---

## 📝 Files Modified

1. ✅ [src/sql/สคีมา](src/sql/สคีมา) - เพิ่มคอลัมน์ user_id
2. ✅ [src/composables/useProfile.ts](src/composables/useProfile.ts) - บันทึก auth.uid()
3. ✅ [src/pages/JoinTeam.vue](src/pages/JoinTeam.vue) - ใช้ user_id
4. ✅ [src/pages/CreateParty.vue](src/pages/CreateParty.vue) - ใช้ user_id
5. ✅ [src/stores/user.ts](src/stores/user.ts) - เพิ่ม isProfileLoaded()
6. ✅ [src/App.vue](src/App.vue) - เพิ่มการจัดการ error
7. ✅ [src/composables/useProfileGuard.ts](src/composables/useProfileGuard.ts) - NEW - Guard composable

---

## 🚨 Important Notes

- **RLS Policy REQUIRED**: ไม่สามารถลบ RLS ได้ถ้าต้องการให้ app ปลอดภัย
- **user_id มีความสำคัญ**: คอลัมน์นี้เป็นกุญแจในการเชื่อมต่อกับระบบ auth
- **Test ก่อน Deploy**: ทดสอบทั้งคุณสมบัติที่แก้ไขแล้ว
