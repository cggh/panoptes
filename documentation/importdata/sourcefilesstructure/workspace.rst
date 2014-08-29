.. _def-source-workspace:

Workspace source files
~~~~~~~~~~~~~~~~~~~~~~
In the :ref:`dataset source folder<def-source-dataset>`, a subfolder ``workspaces`` should be present.
This is the root for a set of subfolders, each one describing a :ref:`workspace<dataconcept_workspace>` for this *dataset*.
The folder name serves as identifier for the *workspace*.

In a *workspace* folder, a yaml structured ``settings`` file should be present,
specifying the displayed name of the workspace (see :ref:`def-settings-workspace`).

In addition, a subfolder ``customdata`` should be present.
This location is used to specify *Custom data*, which has the following basic properties:

- It only exists in the context of a specific *workspace*.
- It adds extra properties to a *data table* that already exists in the *dataset*.
- The primary key of the *data table* (as defined in the settings) is used to link the custom properties to the original table.

See also:

- :ref:`dataconcept_workspace`
- :ref:`def-source-data`