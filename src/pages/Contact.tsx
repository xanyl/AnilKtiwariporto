import { Text, Timeline, Tooltip } from "@mantine/core";
// import { AiOutlineMessage, FaTiktok, FiGithub, FiInstagram, GrLinkedinOption, RiUserFollowLine } from 'react-icons';
import MotionPage from "../components/MotionPage";
import { FiGithub, FiInstagram } from "react-icons/fi";
import { FaLinkedin } from "react-icons/fa";
import ContactForm from "../components/ContactForm";
import { RiUserFollowLine } from "react-icons/ri";
import { AiOutlineMessage } from "react-icons/ai";

export default function Contact() {
  return (
    <MotionPage className="py-7" type="bottom">
      <Text size={42} weight="bold">
        Contact
      </Text>
      <p>
        Please don’t hesitate to get in touch with me by following my social
        media below:
      </p>
      <Timeline active={1} mt="xl">
        <Timeline.Item
          bulletSize={30}
          bullet={<RiUserFollowLine />}
          title={
            <Text weight="bold" size="lg" className="dark:text-gray-400">
              Connect with me :
            </Text>
          }
        >
          <div className="flex justify-start items-center gap-5">
            <MotionPage delay={0.7} type="bottom">
              <Tooltip
                label="Instagram"
                color="gray"
                withArrow
                position="bottom"
              >
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  className="inline-block box-content bg-white p-2 border rounded-lg text-2xl text-gray-600 hover:text-white hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-500 hover:to-red-500 transition-all shadow-md hover:shadow-none"
                >
                  <FiInstagram />
                </a>
              </Tooltip>
            </MotionPage>
            <MotionPage delay={1} type="bottom">
              <Tooltip label="Github" color="gray" withArrow position="bottom">
                <a
                  href="https://github.com/xanyl"
                  target="_blank"
                  className="inline-block box-content bg-white p-2 border rounded-lg text-2xl text-gray-600 hover:text-white hover:bg-black transition-all shadow-md hover:shadow-none"
                >
                  <FiGithub />
                </a>
              </Tooltip>
            </MotionPage>
            <MotionPage delay={1.3} type="bottom">
              <Tooltip
                label="Linkedin"
                color="gray"
                withArrow
                position="bottom"
              >
                <a
                  href="https://www.linkedin.com/in/anilktiwari/"
                  target="_blank"
                  className="inline-block box-content bg-white p-2 border rounded-lg text-2xl text-gray-600 hover:text-white hover:bg-[#0A66C2] transition-all shadow-md hover:shadow-none"
                >
                  <FaLinkedin />
                </a>
              </Tooltip>
            </MotionPage>
          </div>
        </Timeline.Item>
        <Timeline.Item
          bulletSize={30}
          bullet={<AiOutlineMessage />}
          title={
            <Text weight="bold" size="lg" className="dark:text-gray-400">
              Quick Message :
            </Text>
          }
        ></Timeline.Item>
      </Timeline>
      <ContactForm />
    </MotionPage>
  );
}

// export default function Contact() {
//   return (
//     <div>Contact</div>
//   )
// }
