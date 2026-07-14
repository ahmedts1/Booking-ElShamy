const SUPABASE_URL = "https://nknmdsjhhgfgwwofbpzg.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbm1kc2poaGdmZ3d3b2ZicHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjU3NDksImV4cCI6MjA5ODYwMTc0OX0.jGGvCBs9li3L8lSiJd8VOMIq9_L2AipGbyY70fmbEQw";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const tableBody = document.getElementById("registrationsTable");
const stats = document.getElementById("stats");
const filterArea = document.getElementById("filterArea");
const filterGender = document.getElementById("filterGender");
const filterSystem = document.getElementById("filterSystem");
let allRegistrations = [];

[filterArea, filterGender, filterSystem].forEach((item) => item.addEventListener("change", renderRegistrations));
document.addEventListener("DOMContentLoaded", loadRegistrations);

async function loadRegistrations() {
  const { data, error } = await client.from("student_registrations").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="6">تعذر تحميل البيانات. راجع إعدادات Supabase.</td></tr>';
    stats.textContent = "تعذر تحميل الإحصائيات";
    return;
  }

  allRegistrations = data || [];
  renderRegistrations();
}

function getFilteredRegistrations() {
  return allRegistrations.filter((item) =>
    (!filterArea.value || item.area === filterArea.value) &&
    (!filterGender.value || item.gender === filterGender.value) &&
    (!filterSystem.value || item.study_system === filterSystem.value)
  );
}

function renderRegistrations() {
  const filtered = getFilteredRegistrations();
  stats.textContent = `إجمالي المسجلين: ${allRegistrations.length} — النتائج المعروضة: ${filtered.length}`;

  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="6">لا توجد بيانات مطابقة.</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${escapeHtml(item.student_name)}</td>
      <td>${escapeHtml(item.phone)}</td>
      <td>${escapeHtml(item.area)}</td>
      <td>${escapeHtml(item.gender)}</td>
      <td>${escapeHtml(item.study_system)}</td>
      <td>${formatDate(item.created_at)}</td>
    </tr>
  `).join("");
}

function exportRegistrationsCSV() {
  const data = getFilteredRegistrations();
  if (!data.length) return alert("لا توجد بيانات للتصدير.");

  const rows = [["الاسم", "رقم الهاتف", "البلد", "النوع", "نظام الدراسة", "وقت التسجيل"], ...data.map((item) => [
    item.student_name, item.phone, item.area, item.gender, item.study_system, formatDate(item.created_at)
  ])];

  const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-registrations.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}
