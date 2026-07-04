import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      expanded: true,
    },
    docs: {
      theme: "light",
    },
  },
  decorators: [
    (Story) => {
      return (
        <div className="font-sans">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;