async function testLiveApi() {
  console.log("Logging in as admin...");
  try {
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@spaceece.com", password: "Admin@123" })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${errText}`);
    }
    
    const { token } = await loginRes.json();
    console.log("Logged in successfully. Token obtained.\n");

    const getHeaders = { "Authorization": `Bearer ${token}` };

    // Test 1: Activities
    console.log("--- Testing GET /api/admin/activities ---");
    const actRes = await fetch("http://localhost:5000/api/admin/activities", { headers: getHeaders });
    console.log(`Status: ${actRes.status}`);
    const actData = await actRes.json();
    if (actRes.ok) {
      console.log(`Success! Found ${actData.activities?.length} activities.`);
    } else {
      console.error("FAILED:", actData);
    }

    // Test 2: Lesson Plan Assignments
    console.log("\n--- Testing GET /api/admin/lesson-plans/assignments ---");
    const lpRes = await fetch("http://localhost:5000/api/admin/lesson-plans/assignments", { headers: getHeaders });
    console.log(`Status: ${lpRes.status}`);
    const lpData = await lpRes.json();
    if (lpRes.ok) {
      console.log(`Success! Found ${lpData.assignments?.length} lesson plan assignments.`);
    } else {
      console.error("FAILED:", lpData);
    }

    // Test 3: Children
    console.log("\n--- Testing GET /api/admin/children ---");
    const childRes = await fetch("http://localhost:5000/api/admin/children", { headers: getHeaders });
    console.log(`Status: ${childRes.status}`);
    const childData = await childRes.json();
    if (childRes.ok) {
      console.log(`Success! Found ${childData.children?.length} children.`);
    } else {
      console.error("FAILED:", childData);
    }

    // Test 4: Lesson Plans
    console.log("\n--- Testing GET /api/lesson-plans ---");
    const lpPlansRes = await fetch("http://localhost:5000/api/lesson-plans", { headers: getHeaders });
    console.log(`Status: ${lpPlansRes.status}`);
    const lpPlansData = await lpPlansRes.json();
    if (lpPlansRes.ok) {
      console.log(`Success! Found ${lpPlansData.plans?.length || lpPlansData.lessonPlans?.length} lesson plans.`);
    } else {
      console.error("FAILED:", lpPlansData);
    }

    // Test 5: Centers
    console.log("\n--- Testing GET /api/centers ---");
    const centersRes = await fetch("http://localhost:5000/api/centers", { headers: getHeaders });
    console.log(`Status: ${centersRes.status}`);
    const centersData = await centersRes.json();
    if (centersRes.ok) {
      console.log(`Success! Found ${centersData.centers?.length} centers.`);
    } else {
      console.error("FAILED:", centersData);
    }

    // Test 6: Classes
    console.log("\n--- Testing GET /api/admin/classes ---");
    const classesRes = await fetch("http://localhost:5000/api/admin/classes", { headers: getHeaders });
    console.log(`Status: ${classesRes.status}`);
    const classesData = await classesRes.json();
    if (classesRes.ok) {
      console.log(`Success! Found ${classesData.classes?.length} classes.`);
    } else {
      console.error("FAILED:", classesData);
    }

    // Test 7: Courses
    console.log("\n--- Testing GET /api/courses ---");
    const coursesRes = await fetch("http://localhost:5000/api/courses", { headers: getHeaders });
    console.log(`Status: ${coursesRes.status}`);
    const coursesData = await coursesRes.json();
    if (coursesRes.ok) {
      console.log(`Success! Found ${coursesData.courses?.length} courses.`);
    } else {
      console.error("FAILED:", coursesData);
    }

    // Test 8: Teachers
    console.log("\n--- Testing GET /api/admin/teachers ---");
    const teachersRes = await fetch("http://localhost:5000/api/admin/teachers", { headers: getHeaders });
    console.log(`Status: ${teachersRes.status}`);
    const teachersData = await teachersRes.json();
    if (teachersRes.ok) {
      console.log(`Success! Found ${teachersData.teachers?.length} teachers.`);
    } else {
      console.error("FAILED:", teachersData);
    }

  } catch (error) {
    console.error("Global Test Error:", error.message);
  }
}

testLiveApi();
