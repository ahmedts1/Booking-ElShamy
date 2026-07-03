const SUPABASE_URL = "https://nknmdsjhhgfgwwofbpzg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbm1kc2poaGdmZ3d3b2ZicHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjU3NDksImV4cCI6MjA5ODYwMTc0OX0.jGGvCBs9li3L8lSiJd8VOMIq9_L2AipGbyY70fmbEQw";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const groupsTable = document.getElementById("groupsTable");
const bookingsTable = document.getElementById("bookingsTable");
const filterArea = document.getElementById("filterArea");
const filterGender = document.getElementById("filterGender");

let allGroups = [];
let allBookings = [];

document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();
});

filterArea.addEventListener("change", renderBookings);
filterGender.addEventListener("change", renderBookings);

async function loadAdminData() {
  await loadGroups();
  await loadBookings();
}

async function loadGroups() {
  groupsTable.innerHTML = `
    <tr>
      <td colspan="9">جاري تحميل المجموعات...</td>
    </tr>
  `;

  const { data: groups, error } = await client
    .from("groups")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    groupsTable.innerHTML = `
      <tr>
        <td colspan="9">حدث خطأ أثناء تحميل المجموعات.</td>
      </tr>
    `;
    return;
  }

  allGroups = [];

  for (const group of groups) {
    const counts = await getGroupCounts(group.id);

    allGroups.push({
      ...group,
      total_count: counts.total,
      male_count: counts.male,
      female_count: counts.female
    });
  }

  renderGroups();
}

function renderGroups() {
  groupsTable.innerHTML = "";

  allGroups.forEach((group) => {
    const isTotalFull = group.total_count >= group.total_limit;
    const isMaleFull = group.male_count >= group.male_limit;
    const isFemaleFull = group.female_count >= group.female_limit;

    let statusText = "متاحة";

    if (group.is_closed) {
      statusText = "مغلقة يدويًا";
    } else if (isTotalFull) {
      statusText = "مكتملة إجماليًا";
    } else if (isMaleFull && isFemaleFull) {
      statusText = "مكتملة للذكور والإناث";
    } else if (isMaleFull) {
      statusText = "مكتملة للذكور";
    } else if (isFemaleFull) {
      statusText = "مكتملة للإناث";
    }

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(group.area)}</td>

      <td>
        <input 
          class="admin-input" 
          id="group_name_${group.id}" 
          value="${escapeAttribute(group.group_name)}" 
        />
      </td>

      <td>
        <input 
          class="admin-input small" 
          id="time_label_${group.id}" 
          value="${escapeAttribute(group.time_label)}" 
        />
      </td>

      <td>
        <input 
          class="admin-input small" 
          type="number" 
          id="total_limit_${group.id}" 
          value="${group.total_limit}" 
        />
      </td>

      <td>
        <input 
          class="admin-input small" 
          type="number" 
          id="male_limit_${group.id}" 
          value="${group.male_limit}" 
        />
      </td>

      <td>
        <input 
          class="admin-input small" 
          type="number" 
          id="female_limit_${group.id}" 
          value="${group.female_limit}" 
        />
      </td>

      <td>
        <span class="count-pill total">إجمالي: ${group.total_count}</span>
        <span class="count-pill male">ذكور: ${group.male_count}</span>
        <span class="count-pill female">إناث: ${group.female_count}</span>
      </td>

      <td>
        <select class="admin-input" id="is_closed_${group.id}">
          <option value="false" ${!group.is_closed ? "selected" : ""}>مفتوحة</option>
          <option value="true" ${group.is_closed ? "selected" : ""}>مغلقة</option>
        </select>
        <br>
        <small>${statusText}</small>
      </td>

      <td>
        <button class="small-btn" onclick="updateGroup(${group.id})">
          حفظ
        </button>
      </td>
    `;

    groupsTable.appendChild(row);
  });
}

async function updateGroup(groupId) {
  const groupName = document.getElementById(`group_name_${groupId}`).value.trim();
  const timeLabel = document.getElementById(`time_label_${groupId}`).value.trim();

  const totalLimit = Number(document.getElementById(`total_limit_${groupId}`).value);
  const maleLimit = Number(document.getElementById(`male_limit_${groupId}`).value);
  const femaleLimit = Number(document.getElementById(`female_limit_${groupId}`).value);

  const isClosed = document.getElementById(`is_closed_${groupId}`).value === "true";

  if (!groupName || !timeLabel) {
    alert("من فضلك أدخل اسم المجموعة والموعد.");
    return;
  }

  if (totalLimit < 1 || maleLimit < 0 || femaleLimit < 0) {
    alert("من فضلك أدخل حدود صحيحة للأعداد.");
    return;
  }

  if (maleLimit + femaleLimit > totalLimit) {
    const confirmSave = confirm(
      "مجموع حد الذكور والإناث أكبر من الحد الإجمالي. هل تريد الحفظ رغم ذلك؟"
    );

    if (!confirmSave) return;
  }

  const { error } = await client
    .from("groups")
    .update({
      group_name: groupName,
      time_label: timeLabel,
      total_limit: totalLimit,
      male_limit: maleLimit,
      female_limit: femaleLimit,
      is_closed: isClosed
    })
    .eq("id", groupId);

  if (error) {
    console.error(error);
    alert("حدث خطأ أثناء حفظ التعديلات.");
    return;
  }

  alert("تم حفظ التعديلات بنجاح.");
  await loadAdminData();
}

async function loadBookings() {
  bookingsTable.innerHTML = `
    <tr>
      <td colspan="7">جاري تحميل الحجوزات...</td>
    </tr>
  `;

  const { data: bookings, error } = await client
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    bookingsTable.innerHTML = `
      <tr>
        <td colspan="7">حدث خطأ أثناء تحميل الحجوزات.</td>
      </tr>
    `;
    return;
  }

  allBookings = bookings || [];
  renderBookings();
}

function renderBookings() {
  const selectedArea = filterArea.value;
  const selectedGender = filterGender.value;

  let filtered = [...allBookings];

  if (selectedArea) {
    filtered = filtered.filter((booking) => booking.area === selectedArea);
  }

  if (selectedGender) {
    filtered = filtered.filter((booking) => booking.gender === selectedGender);
  }

  bookingsTable.innerHTML = "";

  if (filtered.length === 0) {
    bookingsTable.innerHTML = `
      <tr>
        <td colspan="7">لا توجد حجوزات مطابقة.</td>
      </tr>
    `;
    return;
  }

  filtered.forEach((booking) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(booking.student_name)}</td>
      <td>${escapeHtml(booking.phone)}</td>
      <td>${escapeHtml(booking.gender)}</td>
      <td>${escapeHtml(booking.area)}</td>
      <td>${escapeHtml(booking.group_name)}</td>
      <td>${escapeHtml(booking.time_label)}</td>
      <td>${formatDate(booking.created_at)}</td>
    `;

    bookingsTable.appendChild(row);
  });
}

async function getGroupCounts(groupId) {
  const total = await getBookingsCount(groupId);
  const male = await getBookingsCount(groupId, "ذكر");
  const female = await getBookingsCount(groupId, "أنثى");

  return { total, male, female };
}

async function getBookingsCount(groupId, gender = null) {
  let query = client
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (gender) {
    query = query.eq("gender", gender);
  }

  const { count, error } = await query;

  if (error) {
    console.error(error);
    return 0;
  }

  return count || 0;
}

function exportBookingsCSV() {
  if (!allBookings.length) {
    alert("لا توجد بيانات للتصدير.");
    return;
  }

  const headers = [
    "اسم الطالب",
    "رقم الهاتف",
    "النوع",
    "المنطقة",
    "المجموعة",
    "الموعد",
    "وقت التسجيل"
  ];

  const rows = allBookings.map((booking) => [
    booking.student_name,
    booking.phone,
    booking.gender,
    booking.area,
    booking.group_name,
    booking.time_label,
    formatDate(booking.created_at)
  ]);

  const csvContent = [
    headers,
    ...rows
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const bom = "\uFEFF";

  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "physics-bookings.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString("ar-EG", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return String(text || "").replace(/"/g, "&quot;");
}