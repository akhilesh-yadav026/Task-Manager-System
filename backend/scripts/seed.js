
require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db.js");

const User = require("../models/user.model.js");
const Team = require("../models/team.model.js");
const Project = require("../models/project.model.js");
const Task = require("../models/task.model.js");

// --------------------------------------------------
// HELPER: Get or create a user
// --------------------------------------------------

const getOrCreateUser = async ({
  name,
  email,
  password,
  role,
}) => {
  let user = await User.findOne({ email });

  if (!user) {
    // User model automatically hashes the password.
    user = await User.create({
      name,
      email,
      password,
      role,
      isActive: true,
    });

    console.log(`Created ${role}: ${email}`);
  } else {
    // Update profile details without changing the password.
    user.name = name;
    user.role = role;
    user.isActive = true;

    await user.save();

    console.log(`Reusing existing ${role}: ${email}`);
  }

  return user;
};

// --------------------------------------------------
// HELPER: Get or create a project
// --------------------------------------------------

const getOrCreateProject = async ({
  name,
  description,
  clientName,
  teamId,
  createdBy,
  startDate,
  endDate,
}) => {
  let project = await Project.findOne({
    name,
    team: teamId,
  });

  if (!project) {
    project = await Project.create({
      name,
      description,
      clientName,
      team: teamId,
      createdBy,
      startDate,
      endDate,
      status: "active",
    });

    console.log(`Created project: ${name}`);
  } else {
    console.log(`Reusing existing project: ${name}`);
  }

  return project;
};

// --------------------------------------------------
// HELPER: Get or create a task
// --------------------------------------------------

const getOrCreateTask = async ({
  title,
  description,
  projectId,
  teamId,
  assigneeId,
  priority,
  dueDate,
  createdBy,
}) => {
  let task = await Task.findOne({
    title,
    project: projectId,
  });

  if (!task) {
    task = await Task.create({
      title,
      description,
      project: projectId,
      team: teamId,
      assignee: assigneeId,
      priority,
      dueDate,
      status: "todo",
      createdBy,
    });

    console.log(`Created task: ${title}`);
  } else {
    console.log(`Reusing existing task: ${title}`);
  }

  return task;
};

// --------------------------------------------------
// MAIN SEED FUNCTION
// --------------------------------------------------

const seedDatabase = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    console.log("\nStarting database seeding...\n");

    // 2. Create Admin
    const admin = await getOrCreateUser({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin@123",
      role: "admin",
    });

    // 3. Create Managers
    const managerA = await getOrCreateUser({
      name: "Manager A",
      email: "managerA@example.com",
      password: "Manager@123",
      role: "manager",
    });

    const managerB = await getOrCreateUser({
      name: "Manager B",
      email: "managerB@example.com",
      password: "Manager@123",
      role: "manager",
    });

    // 4. Create Employees
    const employeeA = await getOrCreateUser({
      name: "Employee A",
      email: "employeeA@example.com",
      password: "Employee@123",
      role: "employee",
    });

    const employeeB = await getOrCreateUser({
      name: "Employee B",
      email: "employeeB@example.com",
      password: "Employee@123",
      role: "employee",
    });

    const employeeC = await getOrCreateUser({
      name: "Employee C",
      email: "employeeC@example.com",
      password: "Employee@123",
      role: "employee",
    });

    // 5. Create Teams
    let developmentTeam = await Team.findOne({
      name: "Development Team",
    });

    if (!developmentTeam) {
      developmentTeam = await Team.create({
        name: "Development Team",
        manager: managerA._id,
        members: [],
        isActive: true,
        createdBy: admin._id,
      });

      console.log("Created team: Development Team");
    } else {
      developmentTeam.manager = managerA._id;
      developmentTeam.createdBy = admin._id;
      developmentTeam.isActive = true;

      await developmentTeam.save();

      console.log("Reusing team: Development Team");
    }

    let testingTeam = await Team.findOne({
      name: "Testing Team",
    });

    if (!testingTeam) {
      testingTeam = await Team.create({
        name: "Testing Team",
        manager: managerB._id,
        members: [],
        isActive: true,
        createdBy: admin._id,
      });

      console.log("Created team: Testing Team");
    } else {
      testingTeam.manager = managerB._id;
      testingTeam.createdBy = admin._id;
      testingTeam.isActive = true;

      await testingTeam.save();

      console.log("Reusing team: Testing Team");
    }

    // 6. Assign Managers and Employees to Teams
    managerA.team = developmentTeam._id;
    managerB.team = testingTeam._id;

    employeeA.team = developmentTeam._id;
    employeeB.team = developmentTeam._id;
    employeeC.team = testingTeam._id;

    await Promise.all([
      managerA.save(),
      managerB.save(),
      employeeA.save(),
      employeeB.save(),
      employeeC.save(),
    ]);

    developmentTeam.members = [
      employeeA._id,
      employeeB._id,
    ];

    testingTeam.members = [
      employeeC._id,
    ];

    await Promise.all([
      developmentTeam.save(),
      testingTeam.save(),
    ]);

    console.log("\nTeam memberships configured.");

    // 7. Prepare Project Dates
    const today = new Date();

    const projectStartDate = new Date(today);
    projectStartDate.setHours(0, 0, 0, 0);

    const projectEndDate = new Date(projectStartDate);
    projectEndDate.setDate(
      projectEndDate.getDate() + 30
    );

    // 8. Create Projects
    const developmentProject = await getOrCreateProject({
      name: "Task Manager API",
      description:
        "Develop the backend APIs for the Role-Based Task Manager.",
      clientName: "Internal Client",
      teamId: developmentTeam._id,
      createdBy: managerA._id,
      startDate: projectStartDate,
      endDate: projectEndDate,
    });

    const testingProject = await getOrCreateProject({
      name: "Testing Automation",
      description:
        "Build and execute automated API tests for the task management system.",
      clientName: "Internal Client",
      teamId: testingTeam._id,
      createdBy: managerB._id,
      startDate: projectStartDate,
      endDate: projectEndDate,
    });

    // 9. Create Tasks
    const taskDueDate = (daysFromNow) => {
      const date = new Date();

      date.setDate(date.getDate() + daysFromNow);

      return date;
    };

    // Development Team Tasks
    await getOrCreateTask({
      title: "Implement Authentication",
      description:
        "Implement login, logout, JWT verification, and current-user APIs.",
      projectId: developmentProject._id,
      teamId: developmentTeam._id,
      assigneeId: employeeA._id,
      priority: "high",
      dueDate: taskDueDate(3),
      createdBy: managerA._id,
    });

    await getOrCreateTask({
      title: "Create User Management APIs",
      description:
        "Implement user creation, retrieval, updating, and deletion.",
      projectId: developmentProject._id,
      teamId: developmentTeam._id,
      assigneeId: employeeB._id,
      priority: "high",
      dueDate: taskDueDate(5),
      createdBy: managerA._id,
    });

    await getOrCreateTask({
      title: "Implement Team Management APIs",
      description:
        "Implement team creation, member assignment, and team retrieval.",
      projectId: developmentProject._id,
      teamId: developmentTeam._id,
      assigneeId: employeeA._id,
      priority: "medium",
      dueDate: taskDueDate(7),
      createdBy: managerA._id,
    });

    // Testing Team Tasks
    await getOrCreateTask({
      title: "Write API Tests",
      description:
        "Create tests for the authentication and user management APIs.",
      projectId: testingProject._id,
      teamId: testingTeam._id,
      assigneeId: employeeC._id,
      priority: "high",
      dueDate: taskDueDate(4),
      createdBy: managerB._id,
    });

    await getOrCreateTask({
      title: "Test Authentication",
      description:
        "Verify valid login, invalid credentials, and protected routes.",
      projectId: testingProject._id,
      teamId: testingTeam._id,
      assigneeId: employeeC._id,
      priority: "medium",
      dueDate: taskDueDate(6),
      createdBy: managerB._id,
    });

    await getOrCreateTask({
      title: "Test Team APIs",
      description:
        "Verify team creation, member assignment, and authorization rules.",
      projectId: testingProject._id,
      teamId: testingTeam._id,
      assigneeId: employeeC._id,
      priority: "medium",
      dueDate: taskDueDate(8),
      createdBy: managerB._id,
    });

    // 10. Print Summary
    console.log("\n==================================");
    console.log("DATABASE SEEDED SUCCESSFULLY");
    console.log("==================================");

    console.log("\nUsers: 6");
    console.log("Teams: 2");
    console.log("Projects: 2");
    console.log("Tasks: 6");

    console.log("\nLOGIN CREDENTIALS");
    console.log("------------------------------");

    console.log("Admin:");
    console.log("Email: admin@example.com");
    console.log("Password: Admin@123");

    console.log("\nManager A:");
    console.log("Email: managerA@example.com");
    console.log("Password: Manager@123");

    console.log("\nManager B:");
    console.log("Email: managerB@example.com");
    console.log("Password: Manager@123");

    console.log("\nEmployee A:");
    console.log("Email: employeeA@example.com");
    console.log("Password: Employee@123");

    console.log("\nEmployee B:");
    console.log("Email: employeeB@example.com");
    console.log("Password: Employee@123");

    console.log("\nEmployee C:");
    console.log("Email: employeeC@example.com");
    console.log("Password: Employee@123");

    console.log("\n==================================");
  } catch (error) {
    console.error("\nDatabase seeding failed:", error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

// Execute seed function
seedDatabase();
