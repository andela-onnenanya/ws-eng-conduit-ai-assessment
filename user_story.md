AI Augmented Design & Implementation - User Story
Started at: 2025-12-01T07:15:39.927Z, 0 minutes ago (refresh this page to update)

Assessment Steps
Read the user story requirements below carefully.
Use AI to:
Create an implementation plan that outlines all major steps and decisions for this story.
Conduct any research needed to inform your plan.
Make code adjustments to ensure the story requirements are met.
Run the acceptance tests manually and capture screenshots as evidence of your solution working.
Submit your work by following the instructions in the "Submitting Your Work" section.
User Story Requirements
Summary:
As a user, I want to add co-authors to my articles so that multiple people can edit them together.

Requirements:

Create Article Page: Add a new "Co-Authors" field where users can enter a list of authors.
Edit Article Page: Allow co-authors to edit the article.
BASIC:

Users enter a comma-separated list of email addresses to add co-authors.
When multiple authors edit the same article simultaneously, the last version saved is used.
ADVANCED:

Users enter co-authors in a multi-select dropdown from the list of all current users.
When a user opens an article for editing, the article becomes locked. The lock remains until:
The user saves the article,
Navigates away, or
5 minutes pass after the user is last seen "online".
While an article is locked by one user, other co-authors see an error message when trying to edit.
If a user looses the lock (e.g., because they lost internet connection), they get an error message.
Scope Notes:

You are free to choose how you define "online": it can be based on having the app open or the user actively editing.
All other pages still work unchanged, showing the original author.
Any unrelated bugs or improvements are excluded from the scope of this assessment.
Acceptance Tests
Test 1:

Given: You are logged in as the Zolly user.
When: [SCREENSHOT] You create a new article, add the John user as a co-author
And: You save the article.
Then: The article is saved successfully.
Test 2:

Given: You log in as the John user.
When: You open the article shared by Zolly and start editing it.
Then: [SCREENSHOT] You are able to modify the article.
Test 3:

Given: You log in as Zolly in a new incognito browser window and open the article.
When: You try to edit the article, then:
BASIC: [SCREENSHOT] You are allowed to edit it. If both Zolly and John save, John's version is kept.
ADVANCED: [SCREENSHOT] You receive an error message because the article is locked.
Submitting Your Work
Place the screenshots in the submission folder of your repository. In CodeSpaces, you can upload files to the repository by right clicking on the submission folder and selecting "Upload".
Do not create any subfolders inside the submission folder; all files must be directly in it.
Run the command npm run submit a0Bfv000005Z8uIEAS in the repository root and follow the instructions.
Take the submission ID returned and paste it into the Crossover form. Submit the form.
Optional Story
After submitting your work, you may choose to complete this optional story. The Crossover form will ask if you want to work on it.

If you opt in, you have an extra week to complete it.
Once completed, re-run the submission script.
The optional story will be considered as part of the final hiring decision.
However, your base story must meet a minimum quality threshold before the optional story is even reviewed.
If your base story meets the minimum bar but isn't perfect, the optional story can help improve your overall evaluation.
If your base story doesn't meet the minimum quality threshold, the optional story will not be considered and cannot compensate.
You can still receive full points without attempting the optional story if your base submission is strong.
The optional story only counts if you have completed the ADVANCED version of the main user story.
Optional Story Summary:
As the original author of the article, I want to forcibly unlock my article so I can edit it.

Optional Story Requirements:

On the "edit article" page, which co-author is currently editing the article (if any).
Provide a button for the original author to forcibly unlock the article.
When the button is pressed:
The original author immediately acquires the lock.
The co-author who was editing receives a pop-up notification.
The pop-up shows the current version of the article, allowing the co-author to back it up locally.
After the co-author closes the pop-up, the app takes them to the "view article" page.