import { Box, Text, Timeline } from "@mantine/core";
import MotionPage from "../components/MotionPage";
import useTheme from "../globalState/theme";
import { ThemeState } from "../components/templates/NavBar";

export default function ResearchPublication() {
  const theme = useTheme((state) => (state as ThemeState).theme);

  return (
    <div className="py-7 px-5 sm:px-0">
      <Box mt="md">
        <MotionPage delay={0.5}>
          <Text size={42} weight="bold">
            Research Publication
          </Text>
          <Text
            component="span"
            variant="gradient"
            size={26}
            weight="bold"
            gradient={{
              from: "indigo",
              to: `${theme === "dark" ? "gray" : "black"}`,
              deg: 45,
            }}
          >
            Anil K Tiwari
          </Text>
          <Text size="md" my="sm">
            I am excited to share my latest research publication titled:
            <strong> "DAAL: Density-Aware Adaptive Line Margin Loss for Multi-Modal Deep Metric Learning"</strong>.
            This paper introduces a novel loss function, DAAL, designed to improve the performance of multi-modal deep metric learning by considering data density variations across different domains.
          </Text>
        </MotionPage>
      </Box>

      <Box mt="md">
        <MotionPage delay={1}>
          <Text size={42} weight="bold">
            Key Details
          </Text>
          <Timeline active={0} mt="sm">
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  DAAL: Density-Aware Adaptive Line Margin Loss for Multi-Modal Deep Metric Learning
                </Text>
              }
            >
              <Text className="dark:text-gray-400">
                This research presents a novel approach to multi-modal deep metric learning by introducing DAAL, a density-aware adaptive line margin loss that dynamically adjusts margin distances according to data density. The method improves the ability of deep learning models to learn similarity measures in scenarios where different modalities (e.g., text, image, or speech) are involved.
              </Text>
              <Text size="sm" color="dimmed" mt={4}>
                Published on: 2024
              </Text>
              <Text size="md" color="dimmed" mt={4}>
                Link to full paper:{" "}
                <a
                  href="https://arxiv.org/html/2410.05438v2"
                  target="_blank"
                  className="underline text-blue-400 cursor-pointer"
                >
                  Read Here
                </a>
              </Text>
            </Timeline.Item>
          </Timeline>
        </MotionPage>
      </Box>
    </div>
  );
}
