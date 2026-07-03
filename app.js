const SUPABASE_URL = "https://nknmdsjhhgfgwwofbpzg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbm1kc2poaGdmZ3d3b2ZicHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjU3NDksImV4cCI6MjA5ODYwMTc0OX0.jGGvCBs9li3L8lSiJd8VOMIq9_L2AipGbyY70fmbEQw";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const bookingForm = document.getElementById("bookingForm");
const studentNameInput = document.getElementById("studentName");
const phoneInput = document.getElementById("phone");
const areaSelect = document.getElementById("area");
const groupsContainer = document.getElementById("groupsContainer");
const groupsList = document.getElementById("groupsList");
const messageBox = document.getElementById("message");

let selectedGroup = null;
let currentGroups = [];

document.querySelectorAll("input[name='gender']").forEach((radio) => {
  radio.addEventListener("change", handleFiltersChange);
});

areaSelect.addEventListener("change", handleFiltersChange);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const studentName = studentNameInput.value.trim();
  const phone = normalizePhone(phoneInput.value.trim());
  const gender = getSelectedGender();
  const area = areaSelect.value;

  if (!studentName || !phone || !gender || !area || !selectedGroup) {
    showMessage("من فضلك أكمل كل البيانات واختر المجموعة.", "error");
    return;
  }

  if (!isValidEgyptPhone(phone)) {
    showMessage("من فضلك اكتب رقم هاتف صحيح مثل: 01012345678", "error");
    return;
  }

  const submitBtn = bookingForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "جاري تأكيد الحجز...";

  try {
    const { data, error } = await client.rpc("create_booking", {
      p_student_name: studentName,
      p_phone: phone,
      p_gender: gender,
      p_group_id: selectedGroup.id
    });

    if (error) {
      console.error(error);
      showMessage("حدث خطأ أثناء الحجز. حاول مرة أخرى.", "error");
      return;
    }

    if (!data.success) {
      showMessage(data.message, "error");
      await loadGroups(area, gender);
      return;
    }

    showMessage(
      `
      تم تأكيد الحجز بنجاح ⚡<br>
      الاسم: ${escapeHtml(data.student_name)}<br>
      رقم الهاتف: ${escapeHtml(data.phone)}<br>
      النوع: ${escapeHtml(data.gender)}<br>
      المنطقة: ${escapeHtml(data.area)}<br>
      المجموعة: ${escapeHtml(data.group_name)}<br>
      الموعد: ${escapeHtml(data.time_label)}
      `,
      "success"
    );

    bookingForm.reset();
    selectedGroup = null;
    groupsContainer.classList.add("hidden");
    groupsList.innerHTML = "";

  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ غير متوقع. حاول مرة أخرى.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "تأكيد الحجز";
  }
});

async function handleFiltersChange() {
  selectedGroup = null;

  const area = areaSelect.value;
  const gender = getSelectedGender();

  if (!area || !gender) {
    groupsContainer.classList.add("hidden");
    groupsList.innerHTML = "";
    return;
  }

  await loadGroups(area, gender);
}

async function loadGroups(area, gender) {
  groupsContainer.classList.remove("hidden");
  groupsList.innerHTML = "جاري تحميل المواعيد...";

  const { data: groups, error } = await client
    .from("groups")
    .select("*")
    .eq("area", area)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    groupsList.innerHTML = "حدث خطأ أثناء تحميل المواعيد.";
    return;
  }

  currentGroups = [];

  for (const group of groups) {
    const counts = await getGroupCounts(group.id);

    currentGroups.push({
      ...group,
      total_count: counts.total,
      male_count: counts.male,
      female_count: counts.female
    });
  }

  renderGroups(gender);
}

function renderGroups(gender) {
  groupsList.innerHTML = "";

  currentGroups.forEach((group) => {
    const totalFull = group.total_count >= group.total_limit;
    const maleFull = group.male_count >= group.male_limit;
    const femaleFull = group.female_count >= group.female_limit;

    let isFullForStudent = false;
    let statusText = "متاحة";
    let remainingText = "";

    if (group.is_closed) {
      isFullForStudent = true;
      statusText = "مغلقة";
      remainingText = "هذه المجموعة مغلقة حاليًا";
    } else if (totalFull) {
      isFullForStudent = true;
      statusText = "مكتملة العدد";
      remainingText = "اكتمل العدد الإجمالي للمجموعة";
    } else if (gender === "ذكر" && maleFull) {
      isFullForStudent = true;
      statusText = "مكتملة للذكور";
      remainingText = "عدد الذكور مكتمل في هذه المجموعة";
    } else if (gender === "أنثى" && femaleFull) {
      isFullForStudent = true;
      statusText = "مكتملة للإناث";
      remainingText = "عدد الإناث مكتمل في هذه المجموعة";
    } else {
      const genderLimit = gender === "ذكر" ? group.male_limit : group.female_limit;
      const genderCount = gender === "ذكر" ? group.male_count : group.female_count;
      const genderRemaining = genderLimit - genderCount;

      const totalRemaining = group.total_limit - group.total_count;
      const finalRemaining = Math.min(genderRemaining, totalRemaining);

      remainingText = `المتاح لـ ${gender}: ${finalRemaining}`;
    }

    const groupElement = document.createElement("div");
    groupElement.className = `group-option ${isFullForStudent ? "disabled" : ""}`;

    groupElement.innerHTML = `
      <div class="group-info">
        <strong>${escapeHtml(group.group_name)} - الساعة ${escapeHtml(group.time_label)}</strong>
        <span>${escapeHtml(remainingText)}</span>
        <span>الإجمالي: ${group.total_count} / ${group.total_limit}</span>
      </div>

      <div class="status ${isFullForStudent ? "full" : "available"}">
        ${statusText}
      </div>
    `;

    if (!isFullForStudent) {
      groupElement.addEventListener("click", () => {
        selectedGroup = group;

        document.querySelectorAll(".group-option").forEach((el) => {
          el.classList.remove("selected");
        });

        groupElement.classList.add("selected");
      });
    }

    groupsList.appendChild(groupElement);
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

function getSelectedGender() {
  const selected = document.querySelector("input[name='gender']:checked");
  return selected ? selected.value : "";
}

function normalizePhone(phone) {
  return phone.replace(/\s+/g, "").replace(/-/g, "");
}

function isValidEgyptPhone(phone) {
  return /^01[0-9]{9}$/.test(phone);
}

function showMessage(text, type) {
  messageBox.innerHTML = text;
  messageBox.className = `message ${type}`;
  messageBox.classList.remove("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}