# Timeline Analysis

Discourse is rarely static; concepts, themes, and dominant narratives evolve over time. The **Timeline Analysis** tool is designed specifically to help you track these historical shifts, allowing you to visualize exactly when specific debates peaked, faded, or transformed.

Instead of just telling you *what* is in your corpus, this tool visualizes *when* it happened, plotting your customized concepts chronologically.

## 1\. The Timeline Dashboard

When you open the Timeline Analysis from the main Analysis Dashboard, you are first greeted by the Timeline Manager.

* **Managing Analyses:** This dashboard displays a list of all timeline analyses created by you and your team. You can rename, delete, duplicate, or open existing timelines from this menu.
* **Creating a New Timeline:** Click to create a new analysis. At this stage, you must make a crucial decision about **what you want to count**:
  * **Document Analysis (Default & Most Common):** Counts the number of *documents* that match your concept in a given time period. If an article mentions "Democracy" 10 times, it still only counts as 1 document for that year.
  * **Annotation Analysis (Span, Sentence, Image):** Counts the exact number of *annotations* that match your concept. If an article has 10 sentences coded as "Democracy", it counts as 10 occurrences for that year.

*Manage your saved timelines or create new ones from the initial dashboard.*

## 2\. The Four-Panel Interface

Once you open a Timeline Analysis, you are presented with a powerful four-panel interface.

The left side of the screen is dedicated to **configuration** (Settings and Concepts), while the right/center of the screen is dedicated to **results and exploration** (The Chart and the Provenance View).

*The Timeline Analysis interface is divided into configuration on the left and exploration on the right.*

## 3\. Configuring Settings (Top Left Panel)

Before defining your concepts, you need to tell DATS how to interpret time within your corpus.

* **Group By:** Choose the granularity of your X-axis. You can aggregate your data by **Year**, **Month**, or **Day**. (Year is usually best for large, historical datasets, while Month/Day works well for fast-moving social media or news events).
* **Date Metadata:** You must select which metadata field DATS should use to plot the documents. Usually, this is a field like Publication Date or Year that you verified or filled out during the data import process.

## 4\. Defining Concepts (Bottom Left Panel)

The heart of the Timeline Analysis is your **Concepts**. Unlike the Code Frequency tool which simply counts your existing codes, here *you define exactly what a concept means* using customized filters.

1. **Add a Concept:** Click **Add new concept** in the bottom left panel. Give it a descriptive name (e.g., "Economic Crisis") and assign it a color.
2. **Edit the Concept (Filtering):** Click on the concept to open its filter editor.
3. **Build your Query:** Just like the advanced filtering in the Search View, you define this concept by stacking logical expressions.
   * *Example:* You can define "Economic Crisis" as any document that contains the Tag Domain: Business **AND** contains the Keyword Inflation.
   * *Note:* The filter options available depend on whether you are running a Document timeline or an Annotation timeline.
4. **Save:** Once saved, DATS will instantly calculate the timeline and visualize it on the right!

!!! tip "Multiple Concepts"

    You can create and overlay multiple concepts on the same timeline. This is incredibly powerful for comparative analysis—for example, plotting the rise of "Climate Change" rhetoric against the decline of "Global Warming" terminology.

## 5\. The Timeline Chart (Top Right Panel)

As you build your concepts, the main chart dynamically updates to plot their frequencies over time.

* **Visualization Styles:** Use the toggle buttons at the top right of the chart panel to switch the visualization between a **Line Chart** (great for seeing trends) and a **Bar Chart** (great for seeing sheer volume).
* **Recalculate:** If you change a lot of metadata in your project, you can click the recalculate/refresh button to update the chart.
* **Exporting:** Click the download icon to save your timeline graph as a high-resolution image, ready for your research paper or presentation.

## 6\. The Provenance View (Bottom Right Panel)

A core principle of qualitative research is traceability. You should never look at a spike on a graph without being able to read the underlying text that caused it.

DATS makes this seamless with the **Provenance View**, located directly beneath the chart.

* **Interactive Data Points:** Click on any data point (a dot on a line or a specific bar) in the timeline chart.
* **View the Evidence:** The Provenance View instantly updates to display a list of all the exact documents (or annotations) that make up that specific data point for that specific time period.
* **Jump to Source:** Just like in the Search View, you can click on any document in this Provenance list to open it in a new tab and read the full context!

*Click any point on the chart to instantly see the documents that caused that data point in the Provenance View.*
