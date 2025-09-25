# Fullstack developer Challenge - Appointment Booking System

Dear Developer,

Welcome to the Full-Stack Developer Candidate Test. This test aims to assess your full-stack development skills, approach to complex scheduling logic, and ability to write clean, maintainable code. Below, you will find the details and requirements for this test.

## **The Challenge**

Your task is to develop a complete online appointment booking system with a robust backend scheduling engine and functional frontend interface. You should analyse and implement the following user stories into a working application:

## **User Stories:**

* As a customer, I want to log into my account using pre-defined credentials, so that I can book appointments and manage my bookings.
* As a customer, I want to view available services from a pre-defined list, so that I can choose what type of appointment to book.
* As a customer, I want to select a service and see available time slots for a specific date, so that I can choose when to book my appointment.
* As a customer, I want to confirm and book an appointment, so that I can secure my desired time slot.
* As a customer, I want to view my upcoming appointments, so that I can manage my schedule.
* As a system, I want to prevent double-bookings and overlapping appointments, so that scheduling conflicts are avoided.
* As a system, I want to calculate real-time availability based on staff working hours, existing appointments, service duration, and mandatory buffer times.

## **Optional User Stories (if you want to implement registration):**

* As a new customer, I want to register for an account, so that I can create appointments beyond the test accounts.

## **Core Requirements:**

* **Staff Working Hours**: The system must account for a single staff member's fixed schedule (e.g., 9 AM - 5 PM) and pre-defined breaks.
* **Existing Appointments**: Prevent overlaps and double-bookings by checking all confirmed appointments.
* **Service Duration**: Consider the specific length of each service when calculating availability.
* **Buffer Time**: Add mandatory buffer periods (e.g., 15 minutes) after each service.
* **Real-time Availability**: Dynamically calculate and display only genuinely available time slots.

## **You need to develop this test using the following technologies:**

* **Backend**: Node.js with NestJS framework
* **Frontend**: React with TypeScript
* **Database**: PostgreSQL or any relational database of your choice
* **UI Library**: Ant Design (antd) for consistent UI components
* **Version Control**: Git for source code management


## **Database Schema (Postgresql or Other relational database):**

## **Frontend Requirements:**

* Authentication pages (Login/Registration)
* Booking page with service selection, date picker, and time slot selection
* "My Appointments" page for viewing upcoming bookings
* Responsive design using Ant Design components

## **Pre-defined Data Setup:**

To focus on the core scheduling logic, you can pre-populate the database with the following data:

### **Test User Accounts:**
* **Customer 1**:
    - Email: `customer1@sampleassist.com`
    - Password: `password@123`
* **Customer 2**:
    - Email: `customer2@sampleassist.com`
    - Password: `password@123`
* **Customer 3**:
    - Email: `admin@sampleassist.com`
    - Password: `admin@123`

### **Pre-defined Services:**
* **Haircut** - 30 minutes
* **Hair Styling** - 45 minutes
* **Hair Coloring** - 90 minutes
* **Consultation** - 15 minutes
* **Deep Conditioning Treatment** - 60 minutes

### **Staff Schedule (Single Staff Member):**
* **Working Hours**: Monday to Friday, 9:00 AM - 5:00 PM
* **Lunch Break**: 12:00 PM - 1:00 PM (unavailable for bookings)
* **Buffer Time**: 15 minutes after each appointment

*Note: You can seed this data using database migrations, fixtures, or a simple seeding script. Include the seeding process in your setup instructions.*

## **Scope Exclusions (What NOT to Build):**

* Multiple staff members (single staff member only)
* Admin or staff dashboards for managing services or schedules
* Payment processing
* Email notifications
* Profile editing functionality
* Dynamic service creation (services are pre-defined)

## **Instructions**

**To begin the test, fork this repository, create a branch with your full name, and send us the link to your completed test (link to your repository). If you only clone the repository, you won't be able to push changes, making the pull request more complicated.**

* Set up database with the required schema
* **Seed the database with pre-defined users and services** (use the test data provided above)
* Implement the core scheduling functions for availability calculation
* Create a functional React frontend that demonstrates the complete booking flow
* **Authentication can use the pre-defined test accounts** - no need to implement registration if you prefer to focus on scheduling logic
* Update the README file with clear setup instructions and your approach to the scheduling functions
* Include database seeding instructions and test account credentials
* Paste the branch name into the system and indicate the completion of the test
* Feel free to provide us with feedback regarding the test

## **Our Evaluation Criteria**

We will assess the following aspects of your solution:

* **Core Scheduling Logic**: Accuracy and efficiency of the availability calculation functions
* **Full-Stack Integration**: Seamless communication between frontend and backend
* **Code Quality**: Clean, maintainable, and well-structured code
* **Database Design**: Proper schema design and query optimisation
* **API Design**: RESTful endpoints with proper error handling
* **Frontend UX**: Intuitive user interface and smooth user experience
* **Error Handling**: Comprehensive error handling strategies
* **Documentation**: Quality of README and code comments
* **Testing**: Implementation of unit tests (bonus points)
* **Git History**: Clean commit history and meaningful commit messages

## **Deliverables**

1. A link to a Git repository containing the complete source code
2. A comprehensive README.md file including:
    * Clear setup and installation instructions
    * **Database seeding/migration instructions for pre-defined data**
    * Database schema setup guide
    * Explanation of your scheduling functions approach
    * API documentation
    * **List of pre-defined test accounts and services**
    * Any assumptions or design decisions made

**Time Allocation Suggestion**: Focus 60% of your effort on the backend scheduling logic and API, 30% on the frontend implementation, and 10% on documentation and testing.

Good luck, and we look forward to reviewing your solution!