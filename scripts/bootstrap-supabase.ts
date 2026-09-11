import { createClient, type User } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
const adminName = process.env.BOOTSTRAP_ADMIN_NAME
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD
const receptionistEmail = process.env.BOOTSTRAP_RECEPTIONIST_EMAIL
const receptionistName = process.env.BOOTSTRAP_RECEPTIONIST_NAME
const receptionistPassword = process.env.BOOTSTRAP_RECEPTIONIST_PASSWORD

if (
  !url ||
  !serviceRoleKey ||
  !adminEmail ||
  !adminName ||
  !adminPassword ||
  !receptionistEmail ||
  !receptionistName ||
  !receptionistPassword
) {
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_RECEPTIONIST_EMAIL, BOOTSTRAP_RECEPTIONIST_NAME, BOOTSTRAP_RECEPTIONIST_PASSWORD",
  )
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUser(email: string): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 100) return null
  }
  return null
}

async function ensureStaff(input: {
  email: string
  password: string
  name: string
  role: "manager" | "receptionist"
}) {
  let user = await findUser(input.email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: input.password,
      app_metadata: { ...user.app_metadata, role: input.role },
    })
    if (error) throw error
    user = data.user
  }

  const { error: profileError } = await supabase.from("staff_profiles").upsert({
    id: user.id,
    name: input.name,
    email: input.email,
    role: input.role,
    active: 1,
  })
  if (profileError) throw profileError
  console.log(`Ready: ${input.email} (${input.role})`)
}

await ensureStaff({
  email: adminEmail,
  password: adminPassword,
  name: adminName,
  role: "manager",
})
await ensureStaff({
  email: receptionistEmail,
  password: receptionistPassword,
  name: receptionistName,
  role: "receptionist",
})

console.log("Supabase staff bootstrap complete.")
